import test from 'tape'

import {
  formatErrorOneLine,
  formatErrorLogfile
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
  const output = formatErrorOneLine({error})
  t.equals(output, 'Error: Entity ID: 42 - Request ID: 3 - Message: Some API error - Details: error detail')
  t.end()
})

test('format one line invalid api error', (t) => {
  const invalidApiError = {
    message: 'invalid api error',
    entity: {}
  }
  const json = JSON.stringify(invalidApiError)
  const error = new Error(json)
  const output = formatErrorOneLine({error})
  t.equals(output, `Error: ${json}`)
  t.end()
})

test('format one line standard error', (t) => {
  const output = formatErrorOneLine({error: Error('normal error message')})
  t.equals(output, 'Error: normal error message')
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
  const output = formatErrorLogfile({error})
  t.equals(output.error.data.requestId, apiError.requestId)
  t.equals(output.error.data.message, apiError.message)
  t.equals(output.error.data.details.errors[0].name, apiError.details.errors[0].name)
  t.end()
})

test('format log file standard error', (t) => {
  const error = new Error('normal error message')
  const output = formatErrorLogfile({error})
  t.equals(output.error.message, error.message)
  t.end()
})
