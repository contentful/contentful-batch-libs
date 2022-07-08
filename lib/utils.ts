import type { LogMessage } from './types';

const logLevels = ['info', 'warning', 'error'] as const;

export function isLogMessage(obj: unknown): obj is LogMessage {
  const level = (obj as LogMessage).level;
  return level && logLevels.includes(level);
}
