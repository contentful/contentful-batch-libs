import test from 'blue-tape'
import sinon from 'sinon'

import {
  wrapTask,
  __RewireAPI__ as listrRewireAPI
} from '../../lib/utils/listr'

const teardownListenerMock = sinon.stub()
const listenerMock = sinon.stub().returns(teardownListenerMock)
const formatMessageMock = sinon.stub().returns('formatted error message')

function setup () {
  listenerMock.resetHistory()
  teardownListenerMock.resetHistory()
  formatMessageMock.resetHistory()
  listrRewireAPI.__Rewire__('logToTaskOutput', listenerMock)
  listrRewireAPI.__Rewire__('formatLogMessageOneLine', formatMessageMock)
}

function teardown () {
  listrRewireAPI.__ResetDependency__('logToTaskOutput')
  listrRewireAPI.__ResetDependency__('formatLogMessageOneLine')
}

test('wraps task, sets up listeners and allows modification of task context', (t) => {
  setup()

  const ctx = {}

  const wrappedTask = wrapTask((taskCtx) => {
    taskCtx.done = true
    return Promise.resolve()
  })

  return wrappedTask(ctx)
    .then(() => {
      t.equals(ctx.done, true, 'context got modified by the task')
      t.equals(listenerMock.callCount, 1, 'task listener was initialized')
      t.equals(teardownListenerMock.callCount, 1, 'task listener was teared down')
      t.equals(formatMessageMock.callCount, 0, 'formatMessageMock was not called')
      teardown()
    })
})

test('wraps task and properly formats and throws error', (t) => {
  setup()

  const ctx = {}

  const wrappedTask = wrapTask((taskCtx) => {
    return Promise.reject(new Error('Task failed'))
  })

  return t.shouldFail(
    wrappedTask(ctx)
      .catch((err) => {
        t.equals(Object.keys(ctx).length, 0, 'context got not modified by the task since it failed')
        t.equals(err.message, 'formatted error message', 'error message contains formatted error message')
        t.equals(err.originalError.message, 'Task failed', 'original error message is still present')
        t.equals(listenerMock.callCount, 1, 'task listener was initialized')
        t.equals(teardownListenerMock.callCount, 1, 'task listener was teared down')
        t.equals(formatMessageMock.callCount, 1, 'formatMessageMock was called')
        t.gt(formatMessageMock.args[0][0].ts.length, 0, 'log message contains a timestamp')
        t.equals(formatMessageMock.args[0][0].level, 'error', 'log message has level of error')
        t.equals(formatMessageMock.args[0][0].error.message, 'Task failed', 'log message error has original error message')
        teardown()
        throw err
      })
  )
})
