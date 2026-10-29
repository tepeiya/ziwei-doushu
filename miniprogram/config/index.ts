import { defineConfig } from '@tarojs/cli'
import path from 'path'
import devConfig from './dev'
import prodConfig from './prod'

const config = defineConfig(async (merge, { command, mode }) => {
  const baseConfig = {
    projectName: 'ziwei-miniprogram',
    date: '2026-10-29',
    designWidth: 750,
    deviceRatio: {
      640: 2.34,
      750: 1,
      828: 1.81
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {}
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false
    },
    alias: {
      '@engine': path.resolve(__dirname, '..', '..', 'lib', 'ziwei'),
      '@': path.resolve(__dirname, '..', 'src')
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      postcss: {
        autoprefixer: { enable: true },
        cssModules: { enable: false }
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})

export default config
