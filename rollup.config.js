import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import pkg from './package.json' with { type: 'json' }

import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import alias from '@rollup/plugin-alias'
import terser from '@rollup/plugin-terser'
import replace from '@rollup/plugin-replace'
import { optimizeLodashImports } from '@optimize-lodash/rollup-plugin'
import { visualizer } from 'rollup-plugin-visualizer'
import { babel } from '@rollup/plugin-babel'
import typescript from '@rollup/plugin-typescript'
import polyfillNode from 'rollup-plugin-polyfill-node'
import dts from 'rollup-plugin-dts'

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
  ]
}

const esmConfig = {
  input: 'lib/index.ts',
  output: {
    dir: 'dist/esm',
    format: 'esm',
    preserveModules: true
  },
  plugins: [
    tsPlugin,
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __VERSION__: JSON.stringify(pkg.version)
    })
  ]
}

const cjsConfig = {
  input: 'lib/index.ts',
  output: {
    dir: 'dist/cjs',
    format: 'cjs',
    preserveModules: true,
    entryFileNames: '[name].cjs'
  },
  plugins: [
    tsPlugin,
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __VERSION__: JSON.stringify(pkg.version)
    })
  ]
}

const cjsBundleConfig = {
  ...baseConfig,
  output: {
    file: 'dist/contentful-batch-libs.node.cjs',
    format: 'cjs'
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
      ]
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

const browserConfig = {
  input: 'dist/esm/index.js',
  output: {
    file: 'dist/contentful-batch-libs.browser.js',
    format: 'iife',
    name: 'contentfulManagement'
  },
  plugins: [
    polyfillNode(),
    alias({
      entries: [
        {
          find: 'axios',
          replacement: resolve(__dirname, './node_modules/axios/dist/browser/axios.cjs')
        },
        {
          find: 'process',
          replacement: resolve(__dirname, 'node_modules', 'process/browser')
        }
      ]
    }),
    babel({
      babelHelpers: 'runtime',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: pkg.browserslist,
            modules: false,
            bugfixes: true
          }
        ]
      ],
      plugins: [
        [
          '@babel/plugin-transform-runtime',
          {
            regenerator: true
          }
        ]
      ]
    })
  ]
}

const browserMinConfig = {
  ...browserConfig,
  output: {
    ...browserConfig.output,
    file: 'dist/contentful-batch-libs.browser.min.js'
  },
  plugins: [
    ...browserConfig.plugins,
    terser({
      compress: {
        passes: 5,
        ecma: 2018,
        drop_console: true,
        drop_debugger: true,
        sequences: true,
        booleans: true,
        loops: true,
        unused: true,
        evaluate: true,
        if_return: true,
        join_vars: true,
        collapse_vars: true,
        reduce_vars: true,
        pure_getters: true,
        pure_new: true,
        keep_classnames: false,
        keep_fnames: false,
        keep_fargs: false,
        keep_infinity: false
      },
      format: {
        comments: false,
        beautify: false
      }
    }),
    visualizer({
      emitFile: true,
      filename: 'stats-browser-min.html'
    })
  ]
}

const reactNativeConfig = {
  ...browserConfig,
  output: {
    ...browserConfig.output,
    file: 'dist/contentful-batch-libs.react-native.js',
    format: 'cjs'
  }
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
    dts({
      respectExternal: true
    })
  ]
}

export default [esmConfig, cjsConfig, cjsBundleConfig, browserConfig, browserMinConfig, reactNativeConfig, typesConfig]
