import type {
  ListrContext,
  ListrDefaultRenderer,
  ListrRendererFactory,
  ListrTaskFn,
} from 'listr2';
import { formatLogMessageOneLine, logToTaskOutput } from './logging';

/**
 * Set up log emitter listening from SDK, proper error catching and throwing of SDK errors
 */
export function wrapTask<
  Ctx = ListrContext,
  Renderer extends ListrRendererFactory = ListrDefaultRenderer,
  FallbackRenderer extends ListrRendererFactory = ListrDefaultRenderer,
>(
  func: ListrTaskFn<Ctx, Renderer, FallbackRenderer>,
): ListrTaskFn<Ctx, Renderer, FallbackRenderer> {
  return async (ctx, task) => {
    const teardownTaskListeners = logToTaskOutput(task);

    try {
      await func(ctx, task);
      teardownTaskListeners();
    } catch (err) {
      teardownTaskListeners();

      // Format message as human readable listr output
      const formattedMessage = formatLogMessageOneLine({
        ts: new Date().toJSON(),
        level: 'error',
        error: err as Error,
      });

      const error = new Error(formattedMessage);

      // Enrich error with the original cause
      Object.defineProperty(error, 'originalError', { value: err });

      throw error;
    }
  };
}
