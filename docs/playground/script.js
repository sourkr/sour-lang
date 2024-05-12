import { Interprater } from '../src/sour-interprater/interprater.js';

const code = document.getElementById('code')
const run = document.getElementById('run')
const output = document.getElementById('output')

run.onclick = () => {
  output.innerText = ''
  
  const interprater = new Interprater(msg => {
    output.innerText += msg + '\n'
  })
  
  interprater.interprateCode(code.value)
}