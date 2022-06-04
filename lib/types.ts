import type { ContentfulClientApi } from 'contentful';
import type { ClientAPI } from 'contentful-management';

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
