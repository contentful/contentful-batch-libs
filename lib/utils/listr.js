import { logToTaskOutput, formatLogMessageOneLine } from '../utils/logging'

// Set up log emitter listening from SDK, proper error catching and throwing of SDK errors
export function wrapTask (func) {
  return (ctx, task) => {
    const teardownTaskListeners = logToTaskOutput(task)
    return func(ctx, task)
      .then(() => {
        teardownTaskListeners()
      })
      .catch((error) => {
        teardownTaskListeners()
        // Format message as human readable listr output
        const formattedMessage = formatLogMessageOneLine({
          ts: (new Date()).toJSON(),
          level: 'error',
          error
        })
        const enrichedError = new Error(formattedMessage)

        // Attach original error object for error log
        enrichedError.originalError = error
        throw enrichedError
      })
  }
}
