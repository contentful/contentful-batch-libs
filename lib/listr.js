// import type { ListrDefaultRendererValue, ListrGetRendererClassFromValue, ListrRendererValue, ListrTask } from 'listr2';
// import type { Context } from './types';

import { logToTaskOutput, formatLogMessageOneLine } from './logging';

// Set up log emitter listening from SDK, proper error catching and throwing of SDK errors
export function wrapTask(func) {
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
        error: err
      });
      const enrichedError = new Error(formattedMessage);

      // Attach original error object for error log
      enrichedError.originalError = err;
      throw enrichedError;
    }
  };
}
