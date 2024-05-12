import { Interprater } from './src/sour-interprater/interprater.js';

const tag = /<(?<tag>.*?)>(.*?)<\/\k<tag>>/g
const version = '0.1 Beta'

function lint(code) {
  code.replace(/(\s+)$/, (f, s) => {
    code = code.replace(RegExp(`^\\s{0,${s.length + 1}}`, 'gm'), '')
  })
  
  code = code
    .replaceAll(/(class|fun)\b/g, `<keydef>$1</keydef>`)
    .replaceAll(/(return|export|import|new)/g, `<key>$1</key>`)
    .replace(/\b(\d+)/gm, `<num>$1</num>`)
    .replace(/(true|false)/gm, `<bool>$1</bool>`)
    .replace(/(\w+)\(/g, `<fname>$1</fname>(`)
    .replace(/([(+){=}])/g, `<punc>$1</punc>`)
    .replace(/\b([A-Z]\w+)/g, `<cls>$1</cls>`)
    .replace(/(var) (\w+)/g, `<keydef>$1</keydef> <vname>$2</vname>`)
    
  code = code
    .replace(/".*?(?<!\\)"/g, full => {
      full = full
        .replace(/\<\w+>|<\\\w+>/g, '')
      
      return `<str>${full}</str>`
    })
  
  
  code = code
    .replace(/\/\/.*$/gm, full => {
      full = full
        .replace(tag, '$2')
        .replaceAll('<', '&lt;')
        
      return `<cmt>${full}</cmt>`
    })
    
  return code
}

document.addEventListener("DOMContentLoaded", function() {
  header()
  highlight()
});

function highlight() {
  const pres = document.querySelectorAll("pre");
  
  for (const pre of pres) {
    const code = pre.innerText;
    const html = lint(code);
    pre.innerHTML = html;
  }
}

function header() {
  document.querySelector('.subtitle').innerText = version
}

const template = (html`
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@40,400,1,0" />

<style>
  .root {
    background: white;
    border: 1px solid hsl(50 50% 50%);
    border-radius: 10px;
  }
  
  .root div {
    display: flex;
    padding: 10px;
    border-bottom: 1px solid hsl(50 50% 50%);
    align-items: center;
    color: hsl(50, 50%, 30%);
  }
  
  .root div span:first-child {
    flex: 1;
  }
  
  code {
    background: red;
  }
  
  pre {
    margin: 0;
    border-top: 1px solid hsl(50 50% 50%);
    display: none;
    padding: 10px;
  }
  
  #run {
    color: hsl(50, 100%, 30%);
  }
</style>

<div class="root">
  <div>
    <span><slot name="name"></slot></span>
    <span id="run" class="material-symbols-rounded">play_arrow</span>
  </div>
  <slot id="code" name="code"></slot>
  <pre id="out"></pre>
</div>
`)

function html(a, ...b) {
  const code = a
    .map((a, i) => i==0?a:b[i-1]+a)
    .join('')
    
  const template = document.createElement('template')
  template.innerHTML = code
  return template.content
}

class CodeBlock extends HTMLElement {
  constructor() {
    super()
    
    const root = this.attachShadow({ mode: 'open' })
    root.appendChild(template.cloneNode(true))
    
    root.getElementById('run').onclick = () => {
      const code = root.getElementById('code').assignedElements()[0].innerText
      const out = root.getElementById('out') //.assignedElements()[0].value
      
      out.style.display = 'block'
      
      const interprater = new Interprater(msg => {
        out.innerText += msg
      })
      
      interprater.interprateCode(code)
    }
  }
}

customElements.define('code-block', CodeBlock)