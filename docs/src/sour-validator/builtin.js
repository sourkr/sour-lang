import { DefinationValidator } from './def.js';

// import fs from 'node:fs'
// import path from 'node:path'
// const code = fs.readFileSync(path.resolve('libs/sour-validator/builtins.d.sour'), 'utf8')

const code = await (await fetch(new URL('./builtins.d.sour', import.meta.url))).text()

const validator = new DefinationValidator(code)

export const BUILTINS = validator.validate()