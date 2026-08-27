import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['lib/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  banner (ctx) {
    if (ctx.format !== 'cjs') {
      return {}
    }
    return {
      js: `"use strict";
if (!globalThis.__contentfulBatchLibsCjsDeprecationWarned) {
  globalThis.__contentfulBatchLibsCjsDeprecationWarned = true;
  console.warn('[contentful-batch-libs] Deprecation notice: the next major version of this package will be ESM-only and will drop require() support. Please migrate consuming code to ES modules (import) ahead of that release.');
}`
    }
  }
})
