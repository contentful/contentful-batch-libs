import pkg from './package.json' with { type: 'json' }

import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import sourcemaps from 'rollup-plugin-sourcemaps2'

const tsPlugin = typescript({
  tsconfig: './tsconfig.json',
  declaration: false,
  noEmitOnError: true
})

const baseConfig = {
  input: 'lib/index.ts',
  plugins: [
    tsPlugin,
    sourcemaps(),
    commonjs({
      sourceMap: false,
      transformMixedEsModules: true,
      ignoreGlobal: true,
      ignoreDynamicRequires: true,
      requireReturnsDefault: 'auto'
      // defaultIsModuleExports: true
    }),
    json(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __VERSION__: JSON.stringify(pkg.version)
    })
  ],
  external: [
    'date-fns',
    'figures',
    'https-proxy-agent',
    'node:events',
    'node:fs',
    'node:stream',
    'node:stream/promises',
    'node:util/types',
    'stream',
    'url',
    'uuid'
  ]
}

const esmConfig = {
  input: 'lib/index.ts',
  output: {
    dir: 'dist/esm',
    format: 'esm',
    preserveModules: true,
    sourcemap: true
  },
  plugins: [
    tsPlugin,
    sourcemaps(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __VERSION__: JSON.stringify(pkg.version)
    })
  ],
  external: baseConfig.external
}

// Types build in Rollup
const typesConfig = {
  input: 'lib/index.ts',
  output: {
    dir: 'dist/types',
    format: 'esm',
    preserveModules: true
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      outDir: 'dist/types',
      declaration: true,
      noEmitOnError: true,
      emitDeclarationOnly: true
    })
  ],
  external: baseConfig.external
}

export default [esmConfig, typesConfig]
