import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import pkg from './package.json' with { type: 'json' }

import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import { optimizeLodashImports } from '@optimize-lodash/rollup-plugin'
import { babel } from '@rollup/plugin-babel'
import typescript from '@rollup/plugin-typescript'
import sourcemaps from 'rollup-plugin-sourcemaps2'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
    optimizeLodashImports(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __VERSION__: JSON.stringify(pkg.version)
    })
  ],
  external: [
    'date-fns/format',
    'date-fns/parseISO',
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

const cjsConfig = {
  input: 'lib/index.ts',
  output: {
    dir: 'dist/cjs',
    format: 'cjs',
    preserveModules: true,
    entryFileNames: '[name].cjs',
    sourcemap: true
  },
  plugins: [
    tsPlugin,
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __VERSION__: JSON.stringify(pkg.version)
    })
  ],
  external: baseConfig.external
}

const cjsBundleConfig = {
  ...baseConfig,
  output: {
    file: 'dist/contentful-batch-libs.node.cjs',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [
    ...baseConfig.plugins,
    nodeResolve({
      preferBuiltins: true,
      browser: false
    }),
    babel({
      babelHelpers: 'bundled',
      presets: [
        [
          '@babel/preset-env',
          // Please note: This is set to Node.js v8 in order to satisfy ECMA2017 requirements
          // However, we cannot ensure it will operate without issues on Node.js v8
          { targets: { node: 8 }, modules: false, bugfixes: true }
        ]
      ],
      sourceMaps: true,
      inputSourceMap: true
    }),
    alias({
      entries: [
        {
          find: 'axios',
          replacement: resolve(__dirname, './node_modules/axios/dist/node/axios.cjs')
        }
      ]
    })
  ]
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

export default [esmConfig, cjsConfig, cjsBundleConfig, typesConfig]
