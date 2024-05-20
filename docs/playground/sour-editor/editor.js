const css = (`
  :host {
    display: flex !important;
    position: relative;
    height: 250px;
    gap: 10px;
    font-family: inherit;
    font-size: inherit;
    line-height: 1.5em;
  }
  
  .container {
    height: 100%;
    position: relative;
    flex: 1;
  }
  
  textarea {
    display: block;
    resize: none;
    padding: 0;
    border: none;
    box-sizing: border-box;
    outline: none;
    width: 100%;
    height: 100%;
    color: transparent;
    caret-color: black;
    background: transparent;
    
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  
  textarea::selection {
    color: transparent;
    background: lightgrey;
    border-radius: 10px;
  }
  
  pre {
    margin: 0;
    font-size: inherit;
  }
  
  .pre {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  
  .lineno {
    padding-inline: 10px;
    // box-shadow: 0 0 5px lightgrey;
    clip-path: inset(1px -15px 1px 1px);
  }
  
  err {
    text-decoration: underline wavy red;
  }
  
  .info {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 1px lightgrey;
    padding: 5px;
    border-radius: 10px;
    width: max-content;
  }
  
  .comp {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 1px lightgrey;
    padding: 5px;
    border-radius: 10px;
    width: max-content;
  }
`)

export class SourEditor extends HTMLElement {
  #root
  #textarea
  #pre
  #lineno
  
  constructor() {
    super()

    this.#root = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    const container = document.createElement('div')
    
    this.#textarea  = document.createElement('textarea')
    this.#pre       = document.createElement('pre')
    this.#lineno    = document.createElement('pre')
    
    style.textContent = css
    container.classList.add('container')
    this.#pre.classList.add('pre')
    this.#lineno.classList.add('lineno')
    
    this.#root.append(style, this.#lineno, container)
    container.append(this .#textarea, this.#pre)
    
    this.#update()
    
    this.#textarea.oninput = () => {
      this.#pre.innerText = this.#textarea.value
      this.#update()
      
      if(this.info) this.info.remove()
    }
    
    // this.#textarea.onfocus = () => {
    //   this.dispatchEvent(new FocusEvent('focus'))
    // }
  }
  
  showInfo(info) {
    this.info = document.createElement('div')
    this.info.classList.add('info')
    this.info.style.top = `${this.cursor_y}px`
    this.info.innerText = info
    
    this.#root.appendChild(this.info)
  }
  
  showCompletion(list) {
    console.log(list)
    this.comp = document.createElement('div')
    this.comp.classList.add('comp')
    this.comp.style.top = `${this.cursor_y}px`
    this.comp.innerText = list.join('\n')
    
    this.#root.appendChild(this.comp)
  }
  
  get value() {
    return this.#textarea.value
  }
  
  set value(s) {
    this.#textarea.value = s.text
    this.#pre.innerHTML = s
  }
  
  get current_index() {
    return this.#textarea.selectionStart
  }
  
  get current_line() {
    const caretPos = this.current_index;
    const textBeforeCaret = this.value.substring(0, caretPos);
    const lines = textBeforeCaret.split('\n');
    return lines.length;
  }
  
  get cursor_y() {
    const height = parseFloat(getComputedStyle(this.#textarea).lineHeight)
    const line = this.current_line
    const padding = parseFloat(getComputedStyle(this).paddingTop)
    
    return height * line + padding
  }
  
  #update() {
    var text = this.value.split('\n').map((_, i) => i + 1).join('\n')
    this.#lineno.innerText = text
  }
}


customElements.define('sour-editor', SourEditor)