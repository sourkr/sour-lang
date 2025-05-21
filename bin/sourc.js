#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .command('$0 <inputfile> [outputfile]', 'Compile a .sour file to .wasm', (yargs) => {
    yargs
      .positional('inputfile', {
        describe: 'The .sour input file to compile',
        type: 'string'
      })
      .positional('outputfile', {
        describe: 'The .wasm output file (or name for .wasm and .wat if -i is used)',
        type: 'string',
        default: null // Or some default logic if needed
      });
  })
  .option('version', {
    alias: 'v',
    describe: 'Show version number',
    type: 'boolean'
  })
  .option('help', {
    alias: 'h',
    describe: 'Show help',
    type: 'boolean'
  })
  .option('intermediate', { // For -i flag
    alias: 'i',
    describe: 'Output intermediate .wat file',
    type: 'boolean'
  })
  .strict()
  .help(false) // Disable default help to handle it customly or let yargs handle it if preferred
  .argv;

// Placeholder for actual logic
if (argv.help) {
  // Yargs can auto-generate help. This is a placeholder if custom help is needed.
  // Or use yargs.showHelp(). For now, let's rely on yargs default help triggered by --help
  console.log("Sourc Help: (placeholder - yargs will show its own help)");
  // To make yargs show help, it's often just not catching --help here and letting yargs handle it.
  // For explicit control:
  // yargs(hideBin(process.argv)).showHelp();
  // process.exit(0);
}

if (argv.version) {
  // Version logic will be implemented in the next step
  console.log("Sourc Version: (placeholder)");
}

// Log parsed arguments for now
console.log('Parsed arguments:', argv);

// Placeholder for compilation logic based on argv
// if (argv.inputfile) {
//   console.log(`Compiling ${argv.inputfile} to ${argv.outputfile || 'default_output.wasm'}`);
//   if (argv.intermediate) {
//     console.log('Also generating .wat file');
//   }
// }
