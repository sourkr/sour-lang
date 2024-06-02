import { DefinationValidator } from './def.js';
import fs from 'node:fs'
import path from 'node:path'

// const file = path.join(__dirname, 'builtins.d.sour')
const code = fs.readFileSync(path.resolve('libs/sour-validator/builtins.d.sour'), 'utf8')

const validator = new DefinationValidator(code)

export const BUILTINS = validator.validate()