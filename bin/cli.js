#!/usr/bin/env node

// process.env.NODE_PATH = __dirname + '/../node_modules/'

const chalk = require('chalk')
const semver = require('semver')
const path = require('path')
const requiredVersion = require('../package.json').engines.node

function checkNodeVersion (wanted, id) {
    console.log(process.version)
    if (!semver.satisfies(process.version, wanted)) {
      console.log(chalk.red(
        'You are using Node ' + process.version + ', but this version of ' + id +
        ' requires Node ' + wanted + '.\nPlease upgrade your Node version.'
      ))
      process.exit(1)
    }
}
checkNodeVersion(requiredVersion, 'dh-cli')

const program = require('commander')

program
    .version(require('../package').version, '-v --version')
    .usage('<command> [options]')

program
    .on('--help', () => {
        console.log(' Please look options ')
    })

program.on('-v', () => {
    console.log(require('../package').version)
})

program.command('init')
    .option('umd, --umd', 'create a umd project')
    .action(() => {
        require('../lib/init')()
    })

program.command('dev')
    .action(() => {
        require('../lib/dev')()
    })

program
    .command('build <type-name>')
    .option('p, --production', 'build your project for production')
    .option('d, --default', 'build your project for test')
    .description('build your project use dhcli')
    .action((name, cmd) => {
        require('../lib/build')(name)
    })


    program.parse(process.argv);

