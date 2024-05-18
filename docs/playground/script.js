import { Interprater } from '../src/sour-interprater/interprater.js';

const code = document.getElementById('code')
const run = document.getElementById('run')
const output = document.getElementById('output')

code.onfocus = () => {
  output.style.display = 'none'
}

code.onblur = () => {
  output.style.display = 'block'
}

run.onclick = async () => {
  output.innerText = ''
  
  const interprater = new Interprater()
  interprater.interprateCode(code.value)
  
  while(true) {
    const msg = await interprater.stream.read()
    output.innerText += msg + '\n'
  }
}