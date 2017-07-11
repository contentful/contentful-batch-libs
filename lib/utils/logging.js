import EventEmitter from 'events'

import bfj from 'bfj-node4'
import { isObject } from 'lodash'
import moment from 'moment'

export const logEmitter = new EventEmitter()

function extractErrorInformation (error) {
  const data = JSON.parse(error.message)
  if (isObject(data)) {
    return data
  }
  throw new Error('could not extract API error data')
}

export function formatErrorOneLine (error) {
  if (error.hasOwnProperty('warning')) {
    return error.warning
  }
  try {
    const errorOutput = []
    const data = extractErrorInformation(error.error)
    if ('entity' in data) {
      errorOutput.push(`Entity ID: ${data.entity.sys.id || 'unknown'}`)
    }
    if ('requestId' in data) {
      errorOutput.push(`Request ID: ${data.requestId}`)
    }
    if ('status' in data || 'statusText' in data) {
      const status = [data.status, data.statusText].filter((a) => a).join(' - ')
      errorOutput.push(`Status: ${status}`)
    }
    if ('message' in data) {
      errorOutput.push(`Message: ${data.message}`)
    }
    if ('details' in data && 'errors' in data.details) {
      const errorList = data.details.errors.map((error) => error.details || error.name)
      errorOutput.push(`Details: ${errorList.join(', ')}`)
    }
    return `${error.error.name}: ${errorOutput.join(' - ')}`
  } catch (err) {
    return error.error.toString().replace(/[\n\r]/, ' ')
  }
}

export function formatErrorLogfile (error) {
  if (error.hasOwnProperty('warning')) {
    return error
  }
  try {
    const data = extractErrorInformation(error.error)
    const errorOutput = Object.assign({}, error.error, {data})
    delete errorOutput.message
    error.error = errorOutput
    return error
  } catch (err) {
    if (error.error.stack) {
      error.error.stacktrace = error.error.stack.toString().split(/\n +at /)
    }
    return error
  }
}

export function displayErrorLog (errorLog) {
  if (errorLog.length) {
    const warningsCount = errorLog.filter((error) => error.hasOwnProperty('warning')).length
    const errorsCount = errorLog.filter((error) => error.hasOwnProperty('error')).length
    console.log(`\n\nThe following ${errorsCount} errors and ${warningsCount} warnings occurred:\n`)

    errorLog.map((error) => {
      if (!error.hasOwnProperty('ts')) {
        return formatErrorOneLine({error})
      }
      return `${moment(error.ts).format('HH:mm:SS')} - ${formatErrorOneLine(error)}`
    }).map((error) => console.log(error))

    return
  }
  console.log('No errors or warnings occurred')
}

export function writeErrorLogFile (destination, errorLog) {
  const logFileErrors = errorLog.map(formatErrorLogfile)
  return bfj.write(destination, logFileErrors, {
    circular: 'ignore',
    space: 2
  })
    .then(() => {
      console.log('\nStored the detailed error log file at:')
      console.log(destination)
    })
    .then(() => {
      const multiError = new Error('Errors occured')
      multiError.name = 'ContentfulMultiError'
      multiError.errors = errorLog
      throw multiError
    })
}

export function setupErrorLogging (errorLog) {
  function errorLogger (level, error) {
    errorLog.push({
      ts: (new Date()).toJSON(),
      [level]: error
    })
  }

  logEmitter.addListener('warning', (error) => errorLogger('warning', error))
  logEmitter.addListener('error', (error) => errorLogger('error', error))
}
