import type { ListrContext, ListrDefaultRenderer, ListrRendererFactory, ListrTask } from 'listr2';
import { ContentfulTaskError } from './errors';
import { logToTaskOutput, formatLogMessageOneLine } from './logging';

/**
 * Set up log emitter listening from SDK, proper error catching and throwing of SDK errors
 */
export function wrapTask<Ctx = ListrContext, Renderer extends ListrRendererFactory = ListrDefaultRenderer>(
  func: ListrTask<Ctx, Renderer>['task']
): ListrTask<Ctx, Renderer>['task'] {
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
        error: err as Error
      });

      throw new ContentfulTaskError(formattedMessage, err as Error);
    }
  };
}
