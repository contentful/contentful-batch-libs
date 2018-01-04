import EventEmitter from 'events'

import bfj from 'bfj-node4'
import { isObject } from 'lodash'
import figures from 'figures'
import moment from 'moment'

import getEntityName from './get-entity-name'

export const logEmitter = new EventEmitter()

function extractErrorInformation (error) {
  let source = error.originalError || error
  try {
    const data = JSON.parse(source.message)
    if (isObject(data)) {
      return data
    }
  } catch (err) {
    throw new Error('Unable to extract API error data')
  }
}

export function formatLogMessageOneLine (logMessage) {
  const { level } = logMessage
  if (!level) {
    return logMessage.toString().replace(/\s+/g, ' ')
  }
  if (level === 'info') {
    return logMessage.info
  }
  if (level === 'warning') {
    return logMessage.warning
  }
  try {
    // Display enhanced API error message when available
    const errorOutput = []
    const data = extractErrorInformation(logMessage.error)
    if ('status' in data || 'statusText' in data) {
      const status = [data.status, data.statusText].filter((a) => a).join(' - ')
      errorOutput.push(`Status: ${status}`)
    }
    if ('message' in data) {
      errorOutput.push(`Message: ${data.message}`)
    }
    if ('entity' in data) {
      errorOutput.push(`Entity: ${getEntityName(data.entity)}`)
    }
    if ('details' in data && 'errors' in data.details) {
      const errorList = data.details.errors.map((error) => error.details || error.name)
      errorOutput.push(`Details: ${errorList.join(', ')}`)
    }
    if ('requestId' in data) {
      errorOutput.push(`Request ID: ${data.requestId}`)
    }
    return `${logMessage.error.name}: ${errorOutput.join(' - ')}`
  } catch (err) {
    // Fallback for errors without API information
    return logMessage.error.toString().replace(/\s+/g, ' ')
  }
}

export function formatLogMessageLogfile (logMessage) {
  const { level } = logMessage
  if (level === 'info' || level === 'warning') {
    return logMessage
  }
  if (!logMessage.error) {
    // Enhance node errors to logMessage format
    logMessage.error = logMessage
  }
  try {
    // Enhance error with extracted API error log
    const data = extractErrorInformation(logMessage.error)
    const errorOutput = Object.assign({}, logMessage.error, {data})
    delete errorOutput.message
    logMessage.error = errorOutput
  } catch (err) {
    // Fallback for errors without API information
    if (logMessage.error.stack) {
      logMessage.error.stacktrace = logMessage.error.stack.toString().split(/\n +at /)
    }
  }

  // Listr attaches the whole context to error messages.
  // Remove it to avoid error log file pollution.
  if (typeof logMessage.error === 'object' && 'context' in logMessage.error) {
    delete logMessage.error.context
  }

  return logMessage
}

// Display all errors
export function displayErrorLog (errorLog) {
  if (errorLog.length) {
    const warningsCount = errorLog.filter((error) => error.hasOwnProperty('warning')).length
    const errorsCount = errorLog.filter((error) => error.hasOwnProperty('error')).length
    console.log(`\n\nThe following ${errorsCount} errors and ${warningsCount} warnings occurred:\n`)

    errorLog
      .map((logMessage) => `${moment(logMessage.ts).format('HH:mm:SS')} - ${formatLogMessageOneLine(logMessage)}`)
      .map((logMessage) => console.log(logMessage))

    return
  }
  console.log('No errors or warnings occurred')
}

// Write all log messages instead of infos to the error log file
export function writeErrorLogFile (destination, errorLog) {
  const logFileData = errorLog
    .map(formatLogMessageLogfile)
  return bfj.write(destination, logFileData, {
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

// Init listeners for log messages, transform them into proper format and logs/displays them
export function setupLogging (log) {
  function errorLogger (level, error) {
    const logMessage = {
      ts: (new Date()).toJSON(),
      level,
      [level]: error
    }
    if (level !== 'info') {
      log.push(logMessage)
    }
    logEmitter.emit('display', logMessage)
  }

  logEmitter.addListener('warning', (error) => errorLogger('warning', error))
  logEmitter.addListener('error', (error) => errorLogger('error', error))
  logEmitter.addListener('info', (error) => errorLogger('info', error))
}

// Format log message to display them as task status
export function logToTaskOutput (task) {
  function logToTask (logMessage) {
    const content = formatLogMessageOneLine(logMessage)
    const symbols = {
      'info': figures.tick,
      'warning': figures.warning,
      'error': figures.cross
    }
    task.output = `${symbols[logMessage.level]} ${content}`.trim()
  }

  const startTime = Date.now()

  logEmitter.on('display', logToTask)

  return () => {
    const seconds = Math.ceil((Date.now() - startTime) / 1000)
    task.title = `${task.title} (${seconds}s)`
    logEmitter.removeListener('display', logToTask)
  }
}
