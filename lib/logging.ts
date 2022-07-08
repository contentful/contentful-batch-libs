import type { PathLike } from 'fs';
import type { ListrContext, ListrDefaultRenderer, ListrRendererFactory, ListrTaskWrapper } from 'listr2';
import type { LogMessage } from './types';

import EventEmitter from 'events';
import bfj from 'bfj';
import figures from 'figures';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';

import { getEntityName } from './get-entity-name';
import { ContentfulTaskError } from './errors';
import { isLogMessage } from './utils';

export const logEmitter = new EventEmitter();

function extractErrorInformation(error: ContentfulTaskError) {
  const source = error.originalError || error;
  try {
    const data = JSON.parse(source.message);
    if (data && typeof data === 'object') {
      return data;
    }
  } catch (err) {
    throw new Error('Unable to extract API error data');
  }
}

export function formatLogMessageOneLine<T>(message: T): string {
  if (!isLogMessage(message)) {
    return (message as Object).toString().replace(/\s+/g, ' '); // eslint-disable-line @typescript-eslint/ban-types
  }

  // Might be able to tidy this up more if I can get the types to play nicely.
  if (message.level === 'info') return message[message.level];
  if (message.level === 'warning') return message[message.level];

  try {
    // Display enhanced API error message when available
    const errorOutput: string[] = [];
    const data = extractErrorInformation(message.error);
    if ('status' in data || 'statusText' in data) {
      const status = [data.status, data.statusText].filter((a) => a).join(' - ');
      errorOutput.push(`Status: ${status}`);
    }
    if ('message' in data) {
      errorOutput.push(`Message: ${data.message}`);
    }
    if ('entity' in data) {
      errorOutput.push(`Entity: ${getEntityName(data.entity)}`);
    }
    if ('details' in data && 'errors' in data.details) {
      const errorList = data.details.errors.map((error: any) => error.details || error.name);
      errorOutput.push(`Details: ${errorList.join(', ')}`);
    }
    if ('requestId' in data) {
      errorOutput.push(`Request ID: ${data.requestId}`);
    }
    return `${message.error.name}: ${errorOutput.join(' - ')}`;
  } catch (err) {
    // Fallback for errors without API information
    return message.error.toString().replace(/\s+/g, ' ');
  }
}

export function formatLogMessageLogfile(logMessage: any) {
  const { level } = logMessage;

  if (level === 'info' || level === 'warning') {
    return logMessage;
  }

  if (!logMessage.error) {
    // Enhance node errors to logMessage format
    logMessage.error = logMessage;
  }
  try {
    // Enhance error with extracted API error log
    const data = extractErrorInformation(logMessage.error);
    const errorOutput = Object.assign({}, logMessage.error, { data });
    delete errorOutput.message;
    logMessage.error = errorOutput;
  } catch (err) {
    // Fallback for errors without API information
    if (logMessage.error.stack) {
      logMessage.error.stacktrace = logMessage.error.stack.toString().split(/\n +at /);
    }
  }

  // Listr attaches the whole context to error messages.
  // Remove it to avoid error log file pollution.
  if (typeof logMessage.error === 'object' && 'context' in logMessage.error) {
    delete logMessage.error.context;
  }

  return logMessage;
}

// Display all errors
export function displayErrorLog(errorLog: LogMessage[]) {
  if (errorLog.length) {
    const warningsCount = errorLog.filter((error) => Object.prototype.hasOwnProperty.call(error, 'warning')).length;
    const errorsCount = errorLog.filter((error) => Object.prototype.hasOwnProperty.call(error, 'warning')).length;
    console.log(`\n\nThe following ${errorsCount} errors and ${warningsCount} warnings occurred:\n`);

    errorLog
      .map((logMessage) => `${format(parseISO(logMessage.ts), 'HH:mm:ss')} - ${formatLogMessageOneLine(logMessage)}`)
      .map((logMessage) => console.log(logMessage));

    return;
  }
  console.log('No errors or warnings occurred');
}

// Write all log messages instead of infos to the error log file
export async function writeErrorLogFile(destination: PathLike, errorLog: LogMessage[]) {
  const logFileData = errorLog.map(formatLogMessageLogfile);

  try {
    await bfj.write(destination, logFileData, {
      circular: 'ignore',
      space: 2
    });

    console.log('\nStored the detailed error log file at:');
    console.log(destination);
  } catch (err) {
    // avoid crashing when writing the log file fails
    console.error(err);
  }
}

// Init listeners for log messages, transform them into proper format and logs/displays them
export function setupLogging(log: LogMessage[]) {
  function errorLogger(level: 'info' | 'warning' | 'error', error: unknown) {
    const logMessage = {
      ts: new Date().toJSON(),
      level,
      [level]: error
    } as LogMessage;

    if (level !== 'info') log.push(logMessage);

    logEmitter.emit('display', logMessage);
  }

  logEmitter.addListener('info', (error) => errorLogger('info', error));
  logEmitter.addListener('warning', (error) => errorLogger('warning', error));
  logEmitter.addListener('error', (error) => errorLogger('error', error));
}

// Format log message to display them as task status
export function logToTaskOutput<Ctx = ListrContext, Renderer extends ListrRendererFactory = ListrDefaultRenderer>(
  task: ListrTaskWrapper<Ctx, Renderer>
) {
  function logToTask(logMessage: LogMessage) {
    const content = formatLogMessageOneLine(logMessage);
    const symbols = {
      info: figures.tick,
      warning: figures.warning,
      error: figures.cross
    };
    task.output = `${symbols[logMessage.level]} ${content}`.trim();
  }

  const startTime = Date.now();

  logEmitter.on('display', logToTask);

  return () => {
    const seconds = Math.ceil((Date.now() - startTime) / 1000);
    task.title = `${task.title} (${seconds}s)`;
    logEmitter.removeListener('display', logToTask);
  };
}
