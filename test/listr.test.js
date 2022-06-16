import { wrapTask } from '../lib'
import * as logging from '../lib/logging'

jest.mock('../lib/logging')

const { logToTaskOutput, formatLogMessageOneLine } = logging

beforeEach(() => {
  formatLogMessageOneLine.mockImplementation((logMessage) => `formatted: ${logMessage.error.message}`)
  logToTaskOutput.mockImplementation(() => jest.fn())
})

afterEach(() => {
  logToTaskOutput.mockClear()
  formatLogMessageOneLine.mockClear()
})

test('wraps task, sets up listeners and allows modification of task context', async () => {
  const ctx = {}

  const wrappedTask = wrapTask((taskCtx) => {
    taskCtx.done = true
    return Promise.resolve()
  })

  await wrappedTask(ctx)

  expect(ctx.done).toBe(true)
  expect(logToTaskOutput.mock.calls).toHaveLength(1)
  expect(formatLogMessageOneLine.mock.calls).toHaveLength(0)
})

test('wraps task and properly formats and throws error', async () => {
  expect.assertions(7)

  const ctx = {}
  const errorMessage = 'Task failed'

  const wrappedTask = wrapTask(() => Promise.reject(new Error(errorMessage)))

  try {
    await wrappedTask(ctx)
  } catch (err) {
    expect(err).toMatchObject({
      message: `formatted: ${errorMessage}`,
      originalError: {
        message: errorMessage
      }
    })
  }

  expect(Object.keys(ctx)).toHaveLength(0)
  expect(logToTaskOutput.mock.calls).toHaveLength(1)
  expect(formatLogMessageOneLine.mock.calls).toHaveLength(1)

  expect(formatLogMessageOneLine.mock.calls[0][0].ts).not.toHaveLength(0)
  expect(formatLogMessageOneLine.mock.calls[0][0].level).toBe('error')
  expect(formatLogMessageOneLine.mock.calls[0][0].error.message).toBe(errorMessage)
})
