declare module 'bfj' {
  import type { PathLike } from 'fs';

  export function write(destination: PathLike, data: unknown, options: Record<string, unknown>): Promise<void>;
}
