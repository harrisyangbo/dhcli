'use static'
let form = require('inquirer').createPromptModule()
let request = require('request')
let fs = require('fs')
let path = require('path')
let loadings = require('loading-cli')
let reqLoad = loadings({
    "color":"yellow",
    "frames":["◰", "◳", "◲", "◱"]
})

class DhGitlab {
    constructor() {
        this.tokens = ''
        this.gitlabURL = ''
        this.groupId = ''
        this.projectId = ''
    }
    projectName() {
        let info = fs.readFileSync(path.join(process.cwd(), './package.json'), 'utf8')
        return info ? JSON.parse(info).name : ''
    }
    getGroups(tokens, gitlabURL) {
        reqLoad.start('strat get groups')
        return new Promise(function(resolve, reject) {
            if (!tokens) reject('Please input token to continue!')
            request({
                url: `${gitlabURL}/api/v4/groups?dh_d=${Date.now()}`,
                method: 'GET',
                qs: {
                    private_token: tokens
                },
                json: true
            }, function(error, response, body) {
                if (error) {
                    reqLoad.fail('get groups error')
                    reject(error)
                } else {
                    reqLoad.succeed('get groups success')
                    resolve(body)
                }
            })
        })
    }
    inputUserInfo() {
        return form([{
            message: 'Gitlab url:',
            type: 'input',
            name: 'gitlabURL',
            default: 'http://gitlab.dahai.com'
        },{
            message: 'Gitlab Private token:',
            type: 'input',
            name: 'tokens'
        }])
    }
    getProjects() {
        // 获取所有项目
        let _self = this
        request({
            url: `${_self.gitlabURL}/api/v4/projects`,
            method: 'GET'
        }, function(error, response, body){
            if (response.statusCode == 200) {
                console.log(body)
            } else {
                throw new Error(`This is have a connect Error in Gitlab! errorCode is ${response.statusCode}`)
            }
        })
    }
    createPro() {
        let _self = this
        let proName = _self.projectName()
        reqLoad.start('start create project')
        return new Promise(function(resolve, reject) {
            request({
                url: `${_self.gitlabURL}/api/v4/projects/`,
                method: 'POST',
                headers: {
                    'private_token': _self.tokens
                },
                body: {
                    private_token: _self.tokens,
                    name: proName,
                    namespace_id: _self.groupId ? _self.groupId : 107
                },
                json: true
            },function(error, response, body){
                if(error) {
                    reqLoad.fail('create project error')
                    reject(error)
                } else {
                    reqLoad.succeed('create project success')
                    resolve({
                        res: response,
                        datas: body
                    })
                }
            })
        })
    }
    createHooks() {
        let _self = this
        reqLoad.start('strat create webHooks')
        return new Promise(function(resolve, reject){
            request({
                url: `${_self.gitlabURL}/api/v4/projects/${_self.projectId}/hooks?private_token=${_self.tokens}`,
                method: 'POST',
                headers: {
                    'private_token': _self.tokens,
                    'X-Gitlab-Token': _self.tokens
                },
                body: {
                    id: _self.projectId,
                    url: 'http://auto_deploy.qdsay.com/api/deploy',
                    push_events: true,
                    merge_requests_events: true,
                    tag_push_events: true,
                    token: _self.tokens
                },
                json: true
            }, function(error, response, body){
                if(error) {
                    reqLoad.fail('create webHooks error')
                    reject(error)
                } else {
                    reqLoad.succeed('create webHooks success')
                    resolve({
                        res: response,
                        datas: body
                    })
                }
            })
        })
    }
}

module.exports = DhGitlab