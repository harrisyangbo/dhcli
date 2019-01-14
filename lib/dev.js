const webpack = require('webpack')
const express = require('express')
let expressServer = express()
const getWebpackDevMiddleware = require('webpack-dev-middleware')
const getWebpackHotMiddleware = require('webpack-hot-middleware')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
let webpackLoaders = require('./config/webpack.loaders')
let webpackFeatures = require('./config/webpack.features')
const path = require('path')
const pfs = require('promisify-fs')
const fs = require('fs')
const asar = require('asar')
const Promise = require('bluebird')
const form = require('inquirer').createPromptModule()

let context = {
    devMode: false
}
let cx = {
    __cwd: process.cwd(),
    __plugin_dir: __dirname
}

module.exports = () => {
    cx.__cwd = process.cwd()
    context.devMode = true

    return getWebpackCompiler()
    .then(() => {
        //devMode / proMode output
        return mountWebpackMiddles()
        .then(() => {
            return startDevServer()
        })
    })
    .then(() => {
        console.log('webpack compilation is done, successfully.')
    })
}

function getWebpackCompiler() {
    return pfs.readJSON(path.resolve(cx.__cwd, './package.json')).then((pkg) => {
        let umdConf = require(`${cx.__plugin_dir}/config/webpack.config.umd.js`)
        umdConf.pkg = pkg
        umdConf.devMode = context.devMode
        umdConf.webpackLoaders = webpackLoaders
        umdConf.webpackFeatures = webpackFeatures(cx, umdConf)

        cx.umdConf = umdConf

        //project paths
        cx.__sourcedir = path.resolve(cx.__cwd, umdConf.pkg.wbp.source || './src')
        cx.__testdir = path.resolve(cx.__cwd, umdConf.pkg.wbp.test || './test')
        cx.__builddir = path.resolve(cx.__cwd, umdConf.pkg.wbp.build || './dist')
        cx.__ssldir = path.resolve(cx.__cwd, umdConf.pkg.wbp.ssl || './ssl')
        cx.__cwdDependencesDir = path.resolve(cx.__cwd, './node_modules')
        cx.__homeDependenceDir = path.resolve(cx.__cwd, './node_modules')
        cx.__pluginDependencesDir = path.resolve(cx.__cwd, './node_modules')

        umdConf.addPlugin(new webpack.DefinePlugin({ WBP_DEV: !!context.devMode }))
        //default umd settings
        if (context.devMode) {
            if (context.devMode === 'DEBUG') {
              umdConf.addPlugin(new webpack.HotModuleReplacementPlugin())
            }
          } else {
            umdConf.webpackFeatures.enableUglifyJs()
          }

        //Add Loaders Search Paths
        umdConf.addLoaderSearchPath(cx.__homeDependenceDir)
        umdConf.addLoaderSearchPath(cx.__pluginDependencesDir)
        umdConf.addLoaderSearchPath(cx.__cwdDependencesDir)

        //Add Module Search Paths
        umdConf.addModuleSearchPath(cx.__sourcedir)
        umdConf.addModuleSearchPath(cx.__cwdDependencesDir)
        umdConf.addModuleSearchPath(cx.__homeDependenceDir)
        umdConf.addModuleSearchPath(cx.__pluginDependencesDir)
        umdConf.addModuleSearchPath('node_modules')

        //ResolveEntryModules
        // umdConf.setContext(cx.__sourcedir);
        umdConf.setContext(path.resolve(cx.__cwd, './'))
        umdConf.setExportedName(umdConf.pkg.name)
        umdConf.setBuildPath(cx.__builddir)
        // Local Webpack Settings
        getLocalWebpackConfig(umdConf)
        
        // Add Module Loaders
        umdConf.addModuleLoader(webpackLoaders.getJSLoader(cx, !!context.devMode))
        umdConf.addModuleLoader(webpackLoaders.getCSSLoader(cx, !!context.devMode))
        umdConf.addModuleLoader(webpackLoaders.getFontLoader(cx, !!context.devMode))
        umdConf.addModuleLoader(webpackLoaders.getImgLoader(cx, !!context.devMode))
        umdConf.addModuleLoader(webpackLoaders.getLESS_SRCLoader(cx, !!context.devMode))

        //UMD Project Entries
        for (var key in umdConf.pkg.wbp.entries) {
            umdConf.addBundleEntry(key, umdConf.pkg.wbp.entries[key])
            if (umdConf.webpackOptions.target === 'web') {
                if (umdConf.webpackFeatures.enableEntryHTML) {
                  umdConf.webpackFeatures.installEntryHTML(key)
                }
                if (context.devMode === 'DEBUG') {
                  umdConf.webpackFeatures.enableEntryHot(key)
                }
            }
        }
        //default umd settings
        if (umdConf.webpackOptions.target === 'web') {

            if (umdConf.webpackFeatures.enableChuckHash) {
            umdConf.webpackFeatures.installChuckHash()
            }

            umdConf.addPlugin(new ExtractTextPlugin(`[name]${umdConf.webpackFeatures.enableChuckHash ? '_[contenthash:7]' : ''}.css`))

            if (context.devMode) {
            umdConf.webpackFeatures.enableDevtool()
            }

            if (umdConf.webpackFeatures.enableVue) {
            umdConf.addModuleLoader(webpackLoaders.getVueLoader(cx, !!context.devMode))
            }

            // last features
            if (umdConf.webpackFeatures.enableOffline) {
            umdConf.webpackFeatures.installOffline()
            }
        }

        // webpack options is done
        cx.webpackOptions = umdConf.webpackOptions

        // Create Webpack Compiler
        cx.webpackCompiler = webpack(cx.webpackOptions)
        cx.webpackCompiler.apply(new webpack.ProgressPlugin())
    })
}

function getLocalWebpackConfig(umdConf) {
    let localWebpackConf = null
    try {
        localWebpackConf = require(path.resolve(cx.__cwd, './webpack.config.umd.js'))
    } catch(e) {
        throw new Error(e)
    }
    if (localWebpackConf && localWebpackConf instanceof Function) {
        try {
            localWebpackConf(umdConf, cx);
        } catch (e) {
            console.log('Load local webpack config. error occurs.')
            throw new Error(e)
        }
    } else {
        console.log('Ignore local webpack config. Does not exists or without exporting a function.')
    }
}

function mountWebpackMiddles() {
    return Promise.try(function() {
  
      let webpackHotMiddleware = getWebpackHotMiddleware(cx.webpackCompiler);
      let webpackDevMiddleware = getWebpackDevMiddleware(cx.webpackCompiler, {
        contentBase: cx.webpackOptions.devServer.contentBase,
        publicPath: cx.webpackOptions.output.publicPath,
        noInfo: false,
        quiet: false,
        watchOptions: {
          aggregateTimeout: 100
        },
        state: {
          chunks: false, // Makes the build much quieter
          colors: true
        }
      })
  
      // dynamic / static
      if (cx.umdConf.webpackFeatures.enableHistoryfallback) {
        const publishRoot = cx.webpackOptions.output.publicPath
        expressServer.use((req, res, next) => {
          if (!req.url.match(/(\.(html|css|js|png|jpeg|jpg|woff|appcache|svg|ogg|mp3|wav|ttf|map|xml)|hmr)/) && req.url !== publishRoot) {
            req.originalUrl = req.path = req.url = publishRoot || '/'
          }
          next()
        })
      }
  
      expressServer.use(webpackDevMiddleware)
      expressServer.use(webpackHotMiddleware)
  
      // www
      expressServer.use(express.static(cx.webpackOptions.devServer.contentBase || cx.__builddir))
      expressServer.get('favicon.ico', (req, res) => {
        res.end()
      })
    })
}

function startDevServer() {
    if (fs.existsSync(cx.__ssldir)) {
      // start ssl dev server
      let sslOptions = {
        key: fs.readFileSync(cx.__ssldir + '/key'),
        cert: fs.readFileSync(cx.__ssldir + '/cert')
      }
      require('https').createServer(sslOptions, expressServer).listen(cx.webpackOptions.devServer.port, cx.webpackOptions.devServer.host, function() {
        console.log(`DevServer ${cx.webpackOptions.devServer.host}: ${cx.webpackOptions.devServer.port} *ssl enabled*`)
        // cx.info('DevServer: ' + cx.webpackOptions.devServer.host + ':' + cx.webpackOptions.devServer.port + ' *ssl enabled*');
      })
      return
    }
  
    // start dev server
    return expressServer.listen(cx.webpackOptions.devServer.port, cx.webpackOptions.devServer.host, function() {
        console.log(`DevServer: ${cx.webpackOptions.devServer.host}: ${cx.webpackOptions.devServer.port}   `)
    //   cx.info('DevServer: ' + cx.webpackOptions.devServer.host + ':' + cx.webpackOptions.devServer.port + ' ');
    })
}