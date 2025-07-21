import format from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import figures from 'figures'
import type {
  ListrContext,
  ListrDefaultRenderer,
  ListrRendererFactory,
  ListrTaskWrapper
} from 'listr2'
import EventEmitter from 'node:events'
import { createWriteStream, type PathLike } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { isNativeError } from 'node:util/types'
import { getEntityName } from './get-entity-name.js'
import { isDetails, isErrors, isMessage } from './type-guards.js'

interface InfoMessage {
  ts: string
  level: 'info'
  info: string
}

interface WarningMessage {
  ts: string
  level: 'warning'
  warning: string
}

interface ErrorMessage {
  ts: string
  level: 'error'
  error: Error
}

export type LogMessage = InfoMessage | WarningMessage | ErrorMessage

export const logEmitter = new EventEmitter()

function extractErrorInformation (error: Record<'message', string>) {
  const source =
    'originalError' in error && isMessage(error.originalError)
      ? error.originalError
      : error

  try {
    const data = JSON.parse(source.message)

    if (!data || typeof data !== 'object') {
      throw new TypeError('Unexpected data format, expected object')
    }

    return data as Record<string, unknown>
  } catch (err) {
    throw new Error('Unable to extract API error data')
  }
}

export function formatLogMessageOneLine<
  TMessage extends LogMessage | { level: undefined } | string
> (logMessage: TMessage) {
  if (typeof logMessage === 'string') {
    return logMessage
  } const { level } = logMessage
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

    if ('entity' in data && data.entity) {
      errorOutput.push(`Entity: ${getEntityName(data.entity)}`)
    }

    if (isDetails(data) && isErrors(data.details)) {
      const errorList = data.details.errors.map((error) =>
        isDetails(error) ? error.details : error.name
      )
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

export function formatLogMessageLogfile (logMessage: LogMessage) {
  const { level } = logMessage
  if (level === 'info' || level === 'warning') {
    return logMessage
  }

  // Enhance node errors to logMessage format
  let formattedError: Partial<Error> & {
    data?: {
      requestId: string
      message: string
      details: unknown
    };
  } = logMessage.error ?? logMessage

  if (isNativeError(formattedError)) {
    try {
      // Enhance error with extracted API error log
      const data = extractErrorInformation(formattedError)
      const errorOutput = { ...formattedError, data } as Partial<Error>
      delete errorOutput.message
      formattedError = errorOutput
    } catch (err) {
      // Fallback for errors without API information
      if ('stack' in formattedError && formattedError.stack) {
        const stacktrace = formattedError.stack.toString().split(/\n +at /)
        Object.defineProperty(formattedError, 'stacktrace', {
          value: stacktrace
        })
      }
    }
  }

  // Listr attaches the whole context to error messages.
  // Remove it to avoid error log file pollution.
  if (typeof formattedError === 'object' && 'context' in formattedError) {
    delete formattedError.context
  }

  return { ...structuredClone(logMessage), error: formattedError }
}

// Display all errors
export function displayErrorLog (errorLog: LogMessage[]) {
  if (errorLog.length) {
    const count = errorLog.reduce(
      (count, curr) => {
        if (Object.prototype.hasOwnProperty.call(curr, 'warning')) {
          count.warnings++
        } else if (Object.prototype.hasOwnProperty.call(curr, 'error')) {
          count.errors++
        }
        return count
      },
      { warnings: 0, errors: 0 }
    )

    console.log(
      `\n\nThe following ${count.errors} errors and ${count.warnings} warnings occurred:\n`
    )

    errorLog
      .map(
        (logMessage) =>
          `${format(
            parseISO(logMessage.ts),
            'HH:mm:ss'
          )} - ${formatLogMessageOneLine(logMessage)}`
      )
      .map((logMessage) => console.log(logMessage))

    return
  }
  console.log('No errors or warnings occurred')
}

/**
 * Write all log messages instead of infos to the error log file
 */
export async function writeErrorLogFile (
  destination: PathLike,
  errorLog: ErrorMessage[]
) {
  const formatLogTransformer = new Transform({
    objectMode: true,
    transform: (chunk, encoding, callback) => {
      const formattedChunk = formatLogMessageLogfile(chunk)
      callback(null, Buffer.from(JSON.stringify(formattedChunk)))
    }
  })

  const logFileWriteStream = createWriteStream(destination)

  try {
    await pipeline([
      Readable.from(errorLog),
      formatLogTransformer,
      logFileWriteStream
    ])

    console.log('\nStored the detailed error log file at:')
    console.log(destination)
  } catch (err) {
    // avoid crashing when writing the log file fails
    console.error(err)
  }
}

/**
 * Init listeners for log messages, transform them into proper format and logs/displays them
 */
export function setupLogging (log: (LogMessage)[] = []) {
  function errorLogger (level: LogMessage['level'], error: unknown) {
    const logMessage = {
      ts: new Date().toJSON(),
      level,
      [level]: error
    } as unknown as LogMessage

    if (logMessage.level !== 'info') {
      log.push(logMessage)
    }

    logEmitter.emit('display', logMessage)
  }

  logEmitter.addListener('info', (error) => errorLogger('info', error))
  logEmitter.addListener('warning', (error) => errorLogger('warning', error))
  logEmitter.addListener('error', (error) => errorLogger('error', error))

  return log
}

/**
 * Format log message to display them as task status
 */
export function logToTaskOutput<
  Ctx = ListrContext,
  Renderer extends ListrRendererFactory = ListrDefaultRenderer,
  FallbackRenderer extends ListrRendererFactory = ListrDefaultRenderer
> (task: ListrTaskWrapper<Ctx, Renderer, FallbackRenderer>) {
  function logToTask (logMessage: LogMessage) {
    const content = formatLogMessageOneLine(logMessage)
    const symbols = {
      info: figures.tick,
      warning: figures.warning,
      error: figures.cross
    } as const

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
