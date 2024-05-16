import { DefinationValidator } from './def.js';

const code = await (await fetch(new URL('./builtins.d.sour', import.meta.url))).text()

const validator = new DefinationValidator(code)

export const BUILTINS = validator.validate()