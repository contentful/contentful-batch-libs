import isObject from 'lodash/isObject'
import log from 'npmlog'

let buffer = []

export default {
  push (error) {
    log.error(formatErrorOneLine(error))
    buffer.push(error)
  },

  drain () {
    return buffer.splice(0, buffer.length)
  }
}

function extractErrorInformation (error) {
  const data = JSON.parse(error.message)
  if (isObject(data)) {
    return data
  }
  throw error
}

export function formatErrorOneLine (error) {
  let errorOutput = []
  errorOutput.push(error.name)
  try {
    const data = extractErrorInformation(error)
    if ('entity' in error) {
      errorOutput.push(`Entity ID: ${error.entity.sys.id || 'unknown'}`)
    }
    if ('requestId' in data) {
      errorOutput.push(`Request ID: ${data.requestId}`)
    }
    if ('message' in data) {
      errorOutput.push(`Message: ${data.message}`)
    }
    if ('details' in data && 'errors' in data.details) {
      const errorList = data.details.errors.map((error) => error.details || error.name)
      errorOutput.push(`Details: ${errorList.join(', ')}`)
    }
    return errorOutput.join(' - ')
  } catch (err) {
    errorOutput.push(error.message)
    errorOutput = errorOutput.filter((error) => error)
    errorOutput.push('Check error log for details')
    return errorOutput.join(' - ')
  }
}

export function formatErrorLogfile (error) {
  try {
    const data = extractErrorInformation(error)
    const errorOutput = Object.assign({}, error)
    delete error.message
    if ('requestId' in data) {
      errorOutput.requestId = data.requestId
    }
    if ('message' in data) {
      errorOutput.message = data.message
    }
    if ('details' in data) {
      errorOutput.details = data.details
    }
    return errorOutput
  } catch (err) {
    return error
  }
}
