import test from 'tape'

import {
  formatLogMessageOneLine,
  formatLogMessageLogfile
} from '../../lib/utils/logging'

test('format one line api error', (t) => {
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
  t.equals(output, 'Error: Message: Some API error - Entity: 42 - Details: error detail - Request ID: 3')
  t.end()
})

test('format one line standard error', (t) => {
  const output = formatLogMessageOneLine({error: Error('normal error message'), level: 'error'})
  t.equals(output, 'Error: normal error message')
  t.end()
})

test('format one line standard warning', (t) => {
  const output = formatLogMessageOneLine({warning: 'warning text', level: 'warning'})
  t.equals(output, 'warning text')
  t.end()
})

test('format log file api error', (t) => {
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
  t.equals(output.error.data.requestId, apiError.requestId)
  t.equals(output.error.data.message, apiError.message)
  t.equals(output.error.data.details.errors[0].name, apiError.details.errors[0].name)
  t.end()
})

test('format log file standard error', (t) => {
  const error = new Error('normal error message')
  const output = formatLogMessageLogfile({error, level: 'error'})
  t.equals(output.error.message, error.message)
  t.end()
})
