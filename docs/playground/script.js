import { Validator } from '../src/sour-validator/validator.js';
import { Interprater } from '../src/sour-interprater/interprater.js';
import { Stylable } from './sour-editor/styles.js';
import { Liner } from './linter.js';
import { InfoSeeker } from './info.js';
import { Completer } from './completer.js';

import './sour-editor/editor.js';

const editor = document.querySelector('sour-editor')
const run = document.getElementById('run')
const output = document.getElementById('output')

const blue = 'dodgerblue' 
const violet = 'slateblue'
const green = 'green'

let lastAST = { errors: [], body: [] } 

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
  
  Liner.lintAST(stylable, ast, editor.value.length)
  
  editor.value = stylable
  
  lastAST = ast
  Completer.complete(lastAST, editor)
  
  localStorage.setItem('playground', editor.value)
}

editor.onkeydown = ev => {
  if(ev.key == 'Tab') {
    const index = editor.current_index
    const left = editor.value.substring(0, index)
    const right = editor.value.substring(index)
    editor.value = left + '\t' + right
    editor.current_index = index + 1
    ev.preventDefault()
    editor.dispatchEvent(new InputEvent('input'))
  }
  
  if(ev.key == 'i' && ev.ctrlKey) {
    InfoSeeker.seek(lastAST, editor)
  }
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

function isInsideTok(index, tok, len) {
  return index >= (tok.start?.index ?? len - 1) && index <= (tok.end?.index ?? len)
}


editor.value = localStorage.getItem('playground') || ''
editor.dispatchEvent(new InputEvent('input'))