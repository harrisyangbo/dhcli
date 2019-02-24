const exec = require('child_process').exec
let loadings = require('loading-cli')
let reqLoad = loadings({
    "color":"yellow",
    "frames":["◰", "◳", "◲", "◱"]
})

const cmdMap = {
    'Vue': 'npm install vue --save',
    'React': 'npm install react --save'
}

var cliBash = function(codeLang, options) {
    // 自动安装框架依赖
    return new Promise((resolve, reject) => {
        if (!cmdMap[codeLang]) return resolve()
        reqLoad.start('Install package.....')
        exec(cmdMap[codeLang], options, function(error, stdout, stderr) {
            if (error) {
                reqLoad.fail('Install package error!')
                reject(error || stdout || stderr)
            } else {
                reqLoad.succeed('Install package success!')
                resolve(stdout)
            }
        })
    })
}

module.exports = cliBash