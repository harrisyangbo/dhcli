var webpack = require('webpack');
let webpackLoaders = require('./config/webpack.loaders')
let webpackFeatures = require('./config/webpack.features')
var path = require('path');
var pfs = require('promisify-fs');
var asar = require('asar');
var Promise = require('bluebird');
let git = require('promisify-git');
var form = require('inquirer').createPromptModule();

/**
 * plugin context
 */
var cx = {
  __cwd: process.cwd(),
  __plugin_dir: __dirname
}
/**
 * wbp plugin context (cx)
 * @param {string}  __plugin_dir  plugin's absolute path
 * @param {string}  __cwd        working directory
 * @param {string}  __name       current plugin's name
 * @param {string}  info         utils log info
 * @param {string}  warn         utils log warn
 * @param {string}  error        utils log error
 * @param {function}  call       wbp plugin-call interface
 */
module.exports = function main(options) {
  cx.__cwd = process.cwd()
  // development/production
  // '' dev-debug
  var devMode = 'DEBUG';

  // true 开发输出
  if (options === 'd' || options['developemnt']) {
    devMode = true;
  }

  // false 生产输出
  if (options === 'p' || options['production']) {
    devMode = false;
    process.env.NODE_ENV = 'production';
  }

  return getWebpackCompiler(devMode)
    .then(function() {
      //devMode / proMode output
      if (options === 'd' || options['developemnt'] || options === 'p' || options['production']) {
        return startWebpackCompiler().then(() => {
          if (cx.umdConf.webpackFeatures.enableASAR) {
            return Promise.fromCallback((cb) => {
              const pkg_folder = cx.webpackOptions.devServer.contentBase || cx.__builddir;
              const asar_file = `${cx.webpackOptions.context}/${cx.umdConf.pkg.name}.asar`;
              asar.createPackage(pkg_folder, asar_file, () => {
                cb();
              })
            })
          }
        }).then(() => {
          console.log('*************SUCCESS****************');
          return git.getTags()
        }).then((res) => {
          console.log(`Have tags: ${res.join('|')}`)
          let defaultTag = `${devMode ? 'd' : 'p'}1.0.0`
          if(res.length > 0) {
            defaultTag = `${res[res.length-1]}.${Date.now()}`
          }
          return form([{
            message: 'Please input tag:',
            name: "gitTag",
            type: 'input',
            default: defaultTag
          }])
        })
        .then((data) => {
          let distEnv = devMode ? 'dev' : 'prod'
          if(data.gitTag.substr(0,1) !== 'd' && data.gitTag.substr(0,1) !== 'p') {
            data.gitTag = `${distEnv ? 'd' : 'p'}${data.gitTag}`
          }
          return git('tag -a ' + data.gitTag + ' -m ' + distEnv)
        }).then(() => {
          console.log('Tag success'.green)
        })
        .catch((err) => {
          console.log(err)
        })
      }

    })
    .then(function(finalstate) {
      console.log('webpack compilation is done, successfully.'.green);
    })
};
/**
 * @method startWebpackCompiler
 * @return {[type]}
 */
function startWebpackCompiler() {
  return Promise.fromCallback(function(cb) {
    cx.webpackCompiler.run(cb)
  })
}

/**
 * getWebpackCompiler which support local modification
 * @method getWebpackCompiler
 * @return {[type]}
 */
function getWebpackCompiler(devMode) {
  return pfs
    .readJSON(path.resolve(cx.__cwd, './package.json'))
    .then(function(pkg) {
      let umdConf = require(`${cx.__plugin_dir}/config/webpack.config.umd.js`)
      umdConf.pkg = pkg;
      umdConf.devMode = devMode;
      umdConf.webpackLoaders = webpackLoaders;
      umdConf.webpackFeatures = webpackFeatures(cx, umdConf);

      // Expose umdConfig
      cx.umdConf = umdConf;

      //project paths
      cx.__sourcedir = path.resolve(cx.__cwd, umdConf.pkg.wbp.source || './src')
      cx.__testdir = path.resolve(cx.__cwd, umdConf.pkg.wbp.test || './test')
      cx.__builddir = path.resolve(cx.__cwd, umdConf.pkg.wbp.build || './dist')
      cx.__ssldir = path.resolve(cx.__cwd, umdConf.pkg.wbp.ssl || './ssl')
      cx.__cwdDependencesDir = path.resolve(cx.__cwd, './node_modules')
      cx.__homeDependenceDir = path.resolve(cx.__plugin_dir, '../node_modules')
      cx.__pluginDependencesDir = path.resolve(cx.__plugin_dir, '../node_modules')

      umdConf.addPlugin(new webpack.DefinePlugin({ WBP_DEV: !!devMode }));
      if (devMode) {
        if (devMode === 'DEBUG') {
          umdConf.addPlugin(new webpack.HotModuleReplacementPlugin());
        }
      } else {
        umdConf.webpackFeatures.enableUglifyJs();
      }

      //Add Loaders Search Paths
      umdConf.addLoaderSearchPath(cx.__homeDependenceDir);
      umdConf.addLoaderSearchPath(cx.__pluginDependencesDir);
      umdConf.addLoaderSearchPath('node_modules');

      //Add Module Search Paths
      umdConf.addModuleSearchPath(cx.__sourcedir);
      umdConf.addModuleSearchPath(cx.__cwdDependencesDir)
      umdConf.addModuleSearchPath(cx.__homeDependenceDir);
      umdConf.addModuleSearchPath(cx.__pluginDependencesDir);
      umdConf.addModuleSearchPath('node_modules');

      //ResolveEntryModules
      // umdConf.setContext(cx.__sourcedir);
      umdConf.setContext(path.resolve(cx.__cwd, './'));
      umdConf.setExportedName(umdConf.pkg.name);
      umdConf.setBuildPath(cx.__builddir);

      // Local Webpack Settings -*****************
      getLocalWebpackConfig(umdConf);

      // Add Module Loaders
      umdConf.addModuleLoader(webpackLoaders.getJSLoader(cx, !!devMode))
      umdConf.addModuleLoader(webpackLoaders.getCSSLoader(cx, !!devMode))
      umdConf.addModuleLoader(webpackLoaders.getFontLoader(cx, !!devMode))
      umdConf.addModuleLoader(webpackLoaders.getImgLoader(cx, !!devMode))
      umdConf.addModuleLoader(webpackLoaders.getLESS_SRCLoader(cx, !!devMode))
      if (umdConf.pkg.wbp.codeLang === 'Vue') {
        umdConf.addModuleLoader(webpackLoaders.getVueLoader(cx, !!devMode))
      }

      //UMD Project Entries
      for (var key in umdConf.pkg.wbp.entries) {
        umdConf.addBundleEntry(key, umdConf.pkg.wbp.entries[key]);
        if (umdConf.webpackOptions.target === 'web') {
          if (umdConf.webpackFeatures.enableEntryHTML) {
            umdConf.webpackFeatures.installEntryHTML(key);
          }
          if (devMode === 'DEBUG') {
            umdConf.webpackFeatures.enableEntryHot(key);
          }
        }
      }

      // webpack options is done
      cx.webpackOptions = umdConf.webpackOptions;

      // Create Webpack Compiler
      cx.webpackCompiler = webpack(cx.webpackOptions);
      cx.webpackCompiler.apply(new webpack.ProgressPlugin());
    })
}

/**
 * getLocalWebpackConfig support local modification.
 * @return promise
 */
function getLocalWebpackConfig(umdConf) {
  // 获取用户自定义webpack配置
  var localWebpackConf = null;
  try {
    localWebpackConf = require(cx.__cwd + '/webpack.config.umd.js');
  } catch (e) {
    console.log('ignore local webpack configuartion.');
  }
  if (localWebpackConf && localWebpackConf instanceof Function) {
    try {
      localWebpackConf(umdConf, cx);
    } catch (e) {
        console.log(`Load local webpack config. error occurs. ${e}`.red)
    }
  } else {
    console.log('Ignore local webpack config. Does not exists or without exporting a function.'.green)
  }
}