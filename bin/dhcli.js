#!/usr/bin/env node

var program = require('commander')

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
        require('../lib/dev')
    })

program
    .command('build <type-name>')
    .option('p, --production', 'build your project for production')
    .option('d, --default', 'build your project for test')
    .description('build your project use dhcli')
    .action((name, cmd) => {
        console.log(name)
        console.log(cmd)
        // require('../lib/init')()
    })


    program.parse(process.argv);

