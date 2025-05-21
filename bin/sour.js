#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs'); // For potential file checks in the future

const argv = yargs(hideBin(process.argv))
  .command('$0 <inputfile>', 'Execute a compiled .wasm file', (yargs) => {
    yargs
      .positional('inputfile', {
        describe: 'The .wasm input file or executable name to run',
        type: 'string'
      });
  })
  .option('version', {
    alias: 'v',
    describe: 'Show version number (of the runtime)',
    type: 'boolean'
  })
  .help()
  .strict()
  .argv;

if (argv.version) {
  console.log("sour-lang runtime 1.0.0-beta");
  process.exit(0);
}

if (argv.inputfile) {
  const inputFileName = argv.inputfile;
  console.log(`Executing '${inputFileName}' (placeholder).`);
} else {
  // This part should ideally not be reached if inputfile is mandatory by yargs.
}
