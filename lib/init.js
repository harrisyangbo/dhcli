/*eslint-disable*/
var fs = require('promisify-fs');
var git = require('promisify-git');
var npm = require('promisify-npm');
var form = require('inquirer').createPromptModule();
var Promise = require('bluebird');
var path = require('path');
// var gitlab = require('wbp-gitlab')
var gitlab = require('./gitlab');
const cwd = process.cwd();

/**
 * plugin context
 */
var context, cx;

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
module.exports = function wbpplugin() {
  context = cx = this;
  cx.__cwd = cwd;
    return choiceType()
    .then((lang) => {
      return createUMDModule(lang)
    })
    .then(function() {
      return getProjectInfo()
    })
    .then(function() {
      return initNpm();
    })
    .then(function() {
      return initGitRepo();
    })
    .then(() => {
      return gitlab.inputUserInfo()
    })
    .then((data) => {
      gitlab.tokens = data.tokens
      gitlab.gitlabURL = data.gitlabURL
      return gitlab.getGroups(data.tokens, data.gitlabURL)
    }).then((res) => {
      res.forEach((item) => {
        if(item.name === 'dhfe') {
          gitlab.groupId = item.id
        }
      })
      return gitlab.createPro()
    }).then((res) => {
      if(res.datas.ssh_url_to_repo) {
        gitlab.projectId = res.datas.id
        return git('remote add origin ' + res.datas.ssh_url_to_repo)
      }
    })
    .then(function() {
      return gitlab.createHooks()
    })
    .then(function() {
      return submitInitialCommit()
        .catch(function() {
          cx.warn('The repo may be submitted the initial commit before.')
        })
    })
    .then(function(){
      return git('push origin master')
    })
    .then(function(ret) {
      cx.info('UMD project has been created successfully.');
      // return startDevUMDProject();
    }).catch((err) => {
      console.log(err)
    })
};

/**
 * @method startDevUMDProject
 * @return {promise}
 */
function startDevUMDProject() {
  return form([{
      message: 'Do you want to develop and debug newly-born UMD project?',
      type: 'confirm',
      name: 'comfirm',
      default: true
    }])
    .then(function(formAnswers) {
      if (formAnswers.comfirm) {
        return cx.call('dev');
      }
    })
}

/**
 * getProjectInfo
 * @return promise
 */
var projectInfo = {};

function getProjectInfo() {
  var defaultProject = path.basename(cx.__cwd);
  return form([{
      message: 'Project Name:',
      type: 'input',
      name: 'name',
      default: defaultProject
    }, {
      message: 'Project Description:',
      type: 'input',
      name: 'description',
      default: 'A UMD Web Module.'
    }])
    .then(function(formAnswers) {
      return projectInfo = formAnswers;
    })
}

/**
 * createUMDModule
 * @return promise
 */
function createUMDModule(type) {
  const fsPath = {
    'Vue': `../vuePro/`,
    'React': `../assets/`,
    'normal': `../assets/`
  }
  return Promise.delay(2000).then(function() {
      console.log(cx.__cwd)
    try {
      return fs.cloneFolder([
        `${fsPath[type.lang]}*`,
        `${fsPath[type.lang]}.*`
      ], cx.__cwd)
    } catch(e) {
      throw new Error(e)
    }
  })
  // return Promise
  //   .delay(2000)
  //   .then(function() {
  //     return fs.cloneFolder([
  //       cx.__plugin_dir + '/assets/*',
  //       cx.__plugin_dir + '/assets/.*'
  //     ], cx.__cwd)
  //   })
}

/**
 * initGitRepo
 * @return promise
 */
function initGitRepo() {
  return git.initGit({
    gcwd: cx.__cwd
  })
}

function choiceType() {
  return form([{
    message: 'Choice your language:',
    type: 'list',
    name: 'lang',
    default: 'normal',
    choices: [
      "Vue",
      "React",
      "normal"
    ]
  }])
}

/**
 * initNpm
 * @return promise
 */
function initNpm() {
  return npm.initDefaultPkg(cx.__cwd, {
    name: projectInfo.name,
    description: projectInfo.description,
    author: process.env['USER'] || '',
    main: 'dist/index.js',
    version: '1.0.0',
    scripts: {
      "test": "test/index.js"
    },
    keywords: [projectInfo.name],
    dependencies: {},
    wbp: {
      project: 'umd',
      entries: {
        "index": "./src/index.js"
      },
      source: 'src/',
      build: 'dist/',
    },
    keywords: [projectInfo.name],
    license: "MIT"
  })
}

/**
 * submitInitialCommit
 * @return promise
 */
function submitInitialCommit() {
  return git('add .')
    .then(function() {
      return git('commit -m "Commit Initial - UMD"')
    })
    .catch(function(e) {
      cx.warn('submitInitialCommit got error');
    })
}