import { Validator } from '../src/sour-validator/validator.js';
import { Interprater } from '../src/sour-interprater/interprater.js';
import './sour-editor/editor.js';
import { Stylable, Color } from './sour-editor/styles.js';

const editor = document.querySelector('sour-editor')
const run = document.getElementById('run')
const output = document.getElementById('output')

const blue = 'dodgerblue' 
const violet = 'slateblue'
const green = 'green'

editor.onfocus = () => {
  output.style.display = 'none'
}

editor.onblur = () => {
  output.style.display = 'block'
}

editor.oninput = () => {
  const stylable = new Stylable(editor.value)
  const validator = new Validator(editor.value)
  const ast = validator.validate()
  
  ast.body.forEach(stmt => lint(stylable, stmt))
  
  editor.value = stylable
}

run.onclick = async () => {
  output.innerText = ''
  
  const interprater = new Interprater()
  interprater.interprateCode(editor.value)
  
  while(true) {
    const msg = await interprater.stream.read()
    output.innerText += msg + '\n'
  }
}

function lint(stylable, stmt, color) {
  if(stmt.type == 'str') lint_token(stylable, stmt, green)
  
  if(stmt.type == 'call') {
    lint_token(stylable, stmt.access, blue)
    stmt.args.forEach(arg => lint(stylable, arg))
  }
}

function lint_token(stylable, token, color) {
  stylable.apply(new Color(token.start.index, token.end.index, color))
}