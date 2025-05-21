#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const path = require('path');

const argv = yargs(hideBin(process.argv))
  .command('$0 <inputfile> [outputfile]', 'Compile a .sour file to .wasm', (yargs) => {
    yargs
      .positional('inputfile', {
        describe: 'The .sour input file to compile',
        type: 'string'
      })
      .positional('outputfile', {
        describe: 'The base name for output file(s) (e.g., out for out.wasm)',
        type: 'string',
        // default: 'out' // Defaulting handled in logic now
      });
  })
  .option('version', {
    alias: 'v',
    describe: 'Show version number',
    type: 'boolean'
  })
  // --help is automatically provided by yargs if .help() is true (default)
  .option('intermediate', {
    alias: 'i',
    describe: 'Output intermediate .wat file',
    type: 'boolean'
  })
  .help() // Enable default help handling
  .strict() // Report unrecognized options
  .argv;

if (argv.version) {
  console.log("sour-lang 1.0.0-beta");
  process.exit(0);
}

// Main compilation logic
// Yargs automatically handles showing help if --help is passed or if command is invalid.
// So, no explicit argv.help check is needed unless very custom behavior is desired.

if (argv.inputfile) {
  const inputfile = argv.inputfile;
  // Default outputfile to 'out' if not provided
  const baseOutputName = argv.outputfile || 'out'; 
  
  const outputWasmFile = baseOutputName.endsWith('.wasm') ? baseOutputName : `${baseOutputName}.wasm`;
  
  try {
    // Create empty .wasm file
    fs.writeFileSync(outputWasmFile, '');
    let message = `Compilation of '${inputfile}' to '${outputWasmFile}' successful (placeholder).`;

    if (argv.intermediate) {
      // Ensure .wat extension is used for the .wat file, derived from baseOutputName
      const outputWatFile = baseOutputName.endsWith('.wat') 
                              ? baseOutputName 
                              : (baseOutputName.endsWith('.wasm') 
                                 ? baseOutputName.replace(/\.wasm$/, '.wat') 
                                 : `${baseOutputName}.wat`);
      fs.writeFileSync(outputWatFile, '');
      message += ` Intermediate file '${outputWatFile}' also generated (placeholder).`;
    }
    console.log(message);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
} else {
  // This block might be reached if the command is invoked without inputfile and yargs doesn't make it mandatory.
  // However, yargs default command ($0) with a positional argument <inputfile> makes it mandatory by default.
  // If yargs is set up correctly, it should handle missing required arguments before this code is reached.
  // yargs(hideBin(process.argv)).showHelp(); // Usually not needed here due to yargs built-in handling.
}
