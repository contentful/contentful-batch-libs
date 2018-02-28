import {
  wrapTask
} from '../lib/listr'

import {
  logToTaskOutput,
  teardownHelperMock,
  formatLogMessageOneLine
} from '../lib/logging'

jest.mock('../lib/logging', () => {
  const teardownHelperMock = jest.fn()
  return {
    formatLogMessageOneLine: jest.fn((logMessage) => `formatted: ${logMessage.error.message}`),
    logToTaskOutput: jest.fn(() => {
      return teardownHelperMock
    }),
    teardownHelperMock
  }
})

afterEach(() => {
  logToTaskOutput.mockClear()
  teardownHelperMock.mockClear()
  formatLogMessageOneLine.mockClear()
})

test('wraps task, sets up listeners and allows modification of task context', () => {
  const ctx = {}

  const wrappedTask = wrapTask((taskCtx) => {
    taskCtx.done = true
    return Promise.resolve()
  })

  return wrappedTask(ctx)
    .then(() => {
      expect(ctx.done).toBe(true, 'context got modified by the task')
      expect(logToTaskOutput.mock.calls).toHaveLength(1, 'task listener was initialized')
      expect(teardownHelperMock.mock.calls).toHaveLength(1, 'task listener was teared down again')
      expect(formatLogMessageOneLine.mock.calls).toHaveLength(0, 'no error was formatted')
    })
})

test('wraps task and properly formats and throws error', () => {
  expect.assertions(9)

  const ctx = {}

  const wrappedTask = wrapTask((taskCtx) => {
    return Promise.reject(new Error('Task failed'))
  })

  return wrappedTask(ctx)
    .catch((err) => {
      expect(Object.keys(ctx)).toHaveLength(0, 'context got not modified by the task since it failed')
      expect(err.message).toBe('formatted: Task failed', 'error message contains formatted error message')
      expect(err.originalError.message).toBe('Task failed', 'original error message is still present')

      expect(logToTaskOutput.mock.calls).toHaveLength(1, 'task listener was initialized')
      expect(teardownHelperMock.mock.calls).toHaveLength(1, 'task listener was teared down again')
      expect(formatLogMessageOneLine.mock.calls).toHaveLength(1, 'error message was formatted')

      expect(formatLogMessageOneLine.mock.calls[0][0].ts).not.toHaveLength(0, 'log message contains a timestamp')
      expect(formatLogMessageOneLine.mock.calls[0][0].level).toBe('error', 'log message has level of error')
      expect(formatLogMessageOneLine.mock.calls[0][0].error.message).toBe('Task failed', 'log message error has original error message')
    })
})
