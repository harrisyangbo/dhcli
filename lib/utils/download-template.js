const download = require('download-git-repo')
let loadings = require('loading-cli')
let reqLoad = loadings({
    "color":"yellow",
    "frames":["◰", "◳", "◲", "◱"]
})

const tempURL = {
    'Vue': 'direct:https://github.com/frontlove/vue-template/archive/master.zip',
    'React': 'direct:https://github.com/frontlove/react-template/archive/master.zip',
    'normal': 'direct:https://github.com/frontlove/cli-normal-template/archive/master.zip'
}

module.exports = (lang ,cwd) => {
    return new Promise((resolve, reject) => {
        if (typeof cwd !== 'string' || typeof lang !== 'string') reject('download-template.js:参数错误')
        reqLoad.start('Get template ......')
        download(tempURL[lang], cwd, function(err) {
            if (err) {
                reqLoad.fail('Get template error')
                reject(err)
            } else {
                reqLoad.succeed('Get template success')
                resolve('success')
            }
        })
    })
}