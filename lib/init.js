/*eslint-disable*/
var git = require('promisify-git');
var npm = require('promisify-npm');
var form = require('inquirer').createPromptModule();
var path = require('path');
var fs = require('fs');
var Dhgitlab = require('./gitlab');
var gitlab = new Dhgitlab();
const downloadTemp = require('./utils/download-template');
let clibash = require('./utils/promise-bash');
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
    .then((type) => {
      cx.codeLang = type.lang
    })
    .then(function() {
      return getProjectInfo()
    })
    .then(function() {
      let cwdArr = cx.__cwd.split('/')
      // 判断是否有项目目录
      if (projectInfo.name !== cwdArr[cwdArr.length - 1]) {
        fs.mkdirSync(`./${projectInfo.name}`, { recursive: true })
        cx.__cwd = `${cx.__cwd}/${projectInfo.name}`
      }
      return initNpm();
    })
    .then(function() {
      return downloadTemp(cx.codeLang, cx.__cwd)
    })
    .then(function() {
      return clibash(cx.codeLang, {
        cwd: cx.__cwd
      })
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
      "test": "test/index.js",
      "dev": "cli dev",
      "build-qa": "cli build d",
      "build": "cli build p"
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
      codeLang: cx.codeLang
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