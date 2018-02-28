import {
  formatLogMessageOneLine,
  formatLogMessageLogfile,
  displayErrorLog,
  writeErrorLogFile,
  setupLogging,
  logEmitter,
  logToTaskOutput
} from '../lib/logging'

import figures from 'figures'

import bfj from 'bfj'

function isValidDate (date) {
  return !isNaN(Date.parse(date))
}

jest.mock('bfj', () => ({
  write: jest.fn(() => Promise.resolve())
}))

const consoleLogSpy = jest.spyOn(global.console, 'log')
const logEmitterAddListenerSpy = jest.spyOn(logEmitter, 'addListener')
const logEmitterEmitSpy = jest.spyOn(logEmitter, 'emit')

const exampleErrorLog = [
  {
    ts: new Date('2018-01-01T01:01:01+01:00'),
    level: 'warning',
    warning: 'warning text'
  },
  {
    ts: new Date('2018-02-02T02:02:02+01:00'),
    level: 'error',
    error: new Error('error message')
  }
]

afterEach(() => {
  consoleLogSpy.mockClear()
  logEmitterAddListenerSpy.mockClear()
  logEmitterEmitSpy.mockClear()
})

test('format one line api error', () => {
  const apiError = {
    message: 'Some API error',
    requestId: 3,
    status: 'status',
    statusText: 'status text',
    details: {
      errors: [
        {
          name: 'error detail'
        }
      ]
    },
    entity: {
      sys: {
        id: 42
      }
    }
  }
  const json = JSON.stringify(apiError)
  const error = new Error(json)
  const output = formatLogMessageOneLine({error, level: 'error'})
  expect(output).toBe('Error: Status: status - status text - Message: Some API error - Entity: 42 - Details: error detail - Request ID: 3')
})

test('format one line message with level error', () => {
  const output = formatLogMessageOneLine({error: Error('normal error message'), level: 'error'})
  expect(output).toBe('Error: normal error message')
})

test('format one line message with level warning', () => {
  const output = formatLogMessageOneLine({warning: 'warning text', level: 'warning'})
  expect(output).toBe('warning text')
})

test('format one line message with level info', () => {
  const output = formatLogMessageOneLine({info: 'info text', level: 'info'})
  expect(output).toBe('info text')
})

test('format one line message with no level', () => {
  const output = formatLogMessageOneLine('just a string')
  expect(output).toBe('just a string')
})

test('format log file api error', () => {
  const apiError = {
    message: 'Some API error',
    requestId: 3,
    details: {
      errors: [
        {
          name: 'error detail'
        }
      ]
    },
    entity: {
      sys: {
        id: 42
      }
    }
  }
  const json = JSON.stringify(apiError)
  const error = new Error(json)
  const output = formatLogMessageLogfile({error, level: 'error'})
  expect(output.error.data.requestId).toBe(apiError.requestId)
  expect(output.error.data.message).toBe(apiError.message)
  expect(output.error.data.details.errors[0].name).toBe(apiError.details.errors[0].name)
})

test('format log file standard error', () => {
  const error = new Error('normal error message')
  const output = formatLogMessageLogfile({error, level: 'error'})
  expect(output.error.message).toBe(error.message)
})

test('format log file log message with level warning', () => {
  const logMessage = {warning: 'warning text', level: 'warning'}
  const output = formatLogMessageLogfile(logMessage)
  expect(output).toMatchObject(logMessage)
})

test('format log file log message with level info', () => {
  const logMessage = {warning: 'info text', level: 'info'}
  const output = formatLogMessageLogfile(logMessage)
  expect(output).toMatchObject(logMessage)
})

test('displays error log well formatted', () => {
  displayErrorLog(exampleErrorLog)

  expect(consoleLogSpy.mock.calls).toHaveLength(3)
  expect(consoleLogSpy.mock.calls[0][0]).toContain('The following 1 errors and 1 warnings occurred:')
  expect(consoleLogSpy.mock.calls[1][0]).toMatch(/\d{2}:\d{2}:\d{2} - warning text/)
  expect(consoleLogSpy.mock.calls[2][0]).toMatch(/\d{2}:\d{2}:\d{2} - Error: error message/)
})

test('does not displays error log when empty', () => {
  displayErrorLog([])

  expect(consoleLogSpy.mock.calls).toHaveLength(1)
  expect(consoleLogSpy.mock.calls[0][0]).toContain('No errors or warnings occurred')
})

test('writes error log file to disk', () => {
  expect.assertions(7)
  const destination = '/just/some/path/to/a/file.log'

  return writeErrorLogFile(destination, exampleErrorLog)
    .then(() => {
      expect(consoleLogSpy.mock.calls).toHaveLength(2)
      expect(consoleLogSpy.mock.calls[0][0]).toBe('\nStored the detailed error log file at:')
      expect(consoleLogSpy.mock.calls[1][0]).toBe(destination)

      expect(bfj.write.mock.calls).toHaveLength(1)
      expect(bfj.write.mock.calls[0][0]).toBe(destination)
      expect(bfj.write.mock.calls[0][1]).toMatchObject(exampleErrorLog)
      expect(bfj.write.mock.calls[0][2]).toMatchObject({
        circular: 'ignore',
        space: 2
      })
    })
})

test('sets up logging via event emitter', () => {
  expect.assertions(20)

  const log = []
  setupLogging(log)

  expect(logEmitterAddListenerSpy.mock.calls).toHaveLength(3)
  expect(logEmitterAddListenerSpy.mock.calls[0][0]).toBe('info')
  expect(logEmitterAddListenerSpy.mock.calls[1][0]).toBe('warning')
  expect(logEmitterAddListenerSpy.mock.calls[2][0]).toBe('error')

  function assertLogValues (logMessage) {
    if (logMessage.level === 'info') {
      // Info messages are not logged
      return
    }
    const lastLogItem = log[log.length - 1]
    expect(lastLogItem).toMatchObject({
      level: logMessage.level,
      [logMessage.level]: `example ${logMessage.level}`
    })
    expect(isValidDate(lastLogItem.ts)).toBe(true)
  }

  logEmitter.addListener('display', assertLogValues)

  logEmitterEmitSpy.mockClear()
  logEmitter.emit('info', 'example info')
  expect(logEmitterEmitSpy.mock.calls[1][0]).toBe('display')
  expect(isValidDate(logEmitterEmitSpy.mock.calls[1][1].ts)).toBe(true, 'attaches valid timestamp to log message')
  expect(logEmitterEmitSpy.mock.calls[1][1].level).toBe('info')
  expect(logEmitterEmitSpy.mock.calls[1][1].info).toBe('example info')

  logEmitterEmitSpy.mockClear()
  logEmitter.emit('warning', 'example warning')
  expect(logEmitterEmitSpy.mock.calls[1][0]).toBe('display')
  expect(isValidDate(logEmitterEmitSpy.mock.calls[1][1].ts)).toBe(true, 'attaches valid timestamp to log message')
  expect(logEmitterEmitSpy.mock.calls[1][1].level).toBe('warning')
  expect(logEmitterEmitSpy.mock.calls[1][1].warning).toBe('example warning')

  logEmitterEmitSpy.mockClear()
  logEmitter.emit('error', 'example error')
  expect(logEmitterEmitSpy.mock.calls[1][0]).toBe('display')
  expect(isValidDate(logEmitterEmitSpy.mock.calls[1][1].ts)).toBe(true, 'attaches valid timestamp to log message')
  expect(logEmitterEmitSpy.mock.calls[1][1].level).toBe('error')
  expect(logEmitterEmitSpy.mock.calls[1][1].error).toBe('example error')

  logEmitter.removeListener('display', assertLogValues)
})

test('log messages are logged to task output', () => {
  const taskMock = {
    output: 'nothing to see here'
  }
  const teardown = logToTaskOutput(taskMock)

  logEmitter.emit('display', {
    level: 'info',
    info: 'example info'
  })

  expect(taskMock.output).toBe(`${figures.tick} example info`)

  logEmitter.emit('display', {
    level: 'warning',
    warning: 'example warning'
  })

  expect(taskMock.output).toBe(`${figures.warning} example warning`)

  logEmitter.emit('display', {
    level: 'error',
    error: 'example error'
  })

  expect(taskMock.output).toBe(`${figures.cross} example error`)

  teardown()

  logEmitter.emit('display', {
    level: 'info',
    info: 'this should no more change the task output'
  })

  expect(taskMock.output).not.toBe(`${figures.tick} this should no more change the task output`)
})
