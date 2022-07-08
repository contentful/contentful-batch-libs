import type { ListrContext } from 'listr2';
import { ErrorLogMessage, wrapTask } from '../lib';
import * as logging from '../lib/logging';

jest.mock('../lib/logging');

const { logToTaskOutput, formatLogMessageOneLine } = logging as jest.MockedObject<typeof logging>;

beforeEach(() => {
  logToTaskOutput.mockImplementation(() => jest.fn());
  formatLogMessageOneLine.mockImplementation((logMessage) => {
    return `formatted: ${(logMessage as ErrorLogMessage).error.message}`;
  });
});

afterEach(() => {
  logToTaskOutput.mockClear();
  formatLogMessageOneLine.mockClear();
});

test('wraps task, sets up listeners and allows modification of task context', async () => {
  const ctx: ListrContext = {};

  const wrappedTask = wrapTask((taskCtx) => {
    taskCtx.done = true;
    return Promise.resolve();
  });

  await wrappedTask(ctx, {} as any);

  expect(ctx.done).toBe(true);
  expect(logToTaskOutput.mock.calls).toHaveLength(1);
  expect(formatLogMessageOneLine.mock.calls).toHaveLength(0);
});

test('wraps task and properly formats and throws error', async () => {
  expect.assertions(7);

  const ctx: ListrContext = {};
  const errorMessage = 'Task failed';

  const wrappedTask = wrapTask(() => Promise.reject(new Error(errorMessage)));

  try {
    await wrappedTask(ctx, {} as any);
  } catch (err) {
    expect(err).toMatchObject({
      message: `formatted: ${errorMessage}`,
      originalError: {
        message: errorMessage
      }
    });
  }

  expect(Object.keys(ctx)).toHaveLength(0);
  expect(logToTaskOutput.mock.calls).toHaveLength(1);
  expect(formatLogMessageOneLine.mock.calls).toHaveLength(1);

  const firstCall = formatLogMessageOneLine.mock.calls[0][0] as ErrorLogMessage;
  expect(firstCall.ts).not.toHaveLength(0);
  expect(firstCall.level).toBe('error');
  expect(firstCall.error.message).toBe(errorMessage);
});
