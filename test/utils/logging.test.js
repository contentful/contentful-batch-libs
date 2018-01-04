import {
  formatLogMessageOneLine,
  formatLogMessageLogfile
} from '../../lib/utils/logging'

test('format one line api error', () => {
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
  const output = formatLogMessageOneLine({error, level: 'error'})
  expect(output).toBe('Error: Message: Some API error - Entity: 42 - Details: error detail - Request ID: 3')
})

test('format one line standard error', () => {
  const output = formatLogMessageOneLine({error: Error('normal error message'), level: 'error'})
  expect(output).toBe('Error: normal error message')
})

test('format one line standard warning', () => {
  const output = formatLogMessageOneLine({warning: 'warning text', level: 'warning'})
  expect(output).toBe('warning text')
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
