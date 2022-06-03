import type { EventEmitter } from 'events'
import type { ContentfulClientApi } from 'contentful'
import type { ClientAPI, EntryProps } from 'contentful-management'
import type HttpsProxyAgent from 'https-proxy-agent'
import type { ListrDefaultRendererValue, ListrGetRendererClassFromValue, ListrRendererValue, ListrTask } from 'listr2'

export interface AssetDownloads {
  successCount: number;
  warningCount: number;
  errorCount: number;
}

export interface Context {
  client: ClientAPI;
  cdaClient?: ContentfulClientApi;

  assetDownloads?: AssetDownloads;
  data?: Record<string, unknown[]>;
  logDirectoryExists?: boolean;
}

export interface ProxyObject {
  host: string;
  port: number;

  auth?: {
    username: string;
    password: string;
  }
  isHttps?: string;
  protocol?: string;
}

export const logEmitter: EventEmitter

export function addSequenceHeader(headers: Record<string, string>): Record<string, string>;

export function getEntityName<T>(entity: EntryProps<T>): string;

export function wrapTask<Ctx extends Context = Context, Renderer extends ListrRendererValue = ListrDefaultRendererValue>(func: ListrTask<Ctx, ListrGetRendererClassFromValue<Renderer>>['task']): ListrTask<Ctx, ListrGetRendererClassFromValue<Renderer>>['task'];

export function displayErrorLog(errorLog: unknown[]): void;

export function setupLogging(log: unknown[]): void;

export function writeErrorLogFile(destination: string, errorLog: unknown[]): Promise<void>;

export function proxyStringToObject(proxyString: string): ProxyObject;

export function agentFromProxy(proxyObject: ProxyObject): HttpsProxyAgent;
