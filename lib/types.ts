import { ContentfulTaskError } from './errors';

export interface AssetDownloads {
  successCount: number;
  warningCount: number;
  errorCount: number;
}

export interface Authorization {
  username?: string;
  password?: string;
}

type BaseLogMessage = {
  level: string;
  ts: string;
};

export type InfoLogMessage = BaseLogMessage & {
  level: 'info';
  ['info']: string;
};

export type WarningLogMessage = BaseLogMessage & {
  level: 'warning';
  ['warning']: string;
};

export type ErrorLogMessage = BaseLogMessage & {
  level: 'error';
  ['error']: ContentfulTaskError | Error;
};

export type LogMessage = InfoLogMessage | WarningLogMessage | ErrorLogMessage;
