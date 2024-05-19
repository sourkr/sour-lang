const css = (`
  :host {
    height: 250px;
    display: flex !important;
    gap: 10px;
    font-family: inherit;
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
    font-size: 1em;
    color: transparent;
    caret-color: black;
    background: transparent;
    font-family: inherit;
  }
  
  textarea::selection {
    color: transparent;
    background: lightgrey;
    border-radius: 10px;
  }
  
  pre {
    margin: 0;
    font - size: 1 em;
  }
  
  .pre {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    font-family: inherit;
  }
  
  .lineno {
    padding-inline: 10px;
    // box-shadow: 0 0 5px lightgrey;
    clip-path: inset(1px -15px 1px 1px);
  }
  
  err {
    text-decoration: underline wavy red;
  }
`)

export class SourEditor extends HTMLElement {
  #textarea
  #pre
  #lineno
  
  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    const container = document.createElement('div')
    
    this.#textarea  = document.createElement('textarea')
    this.#pre       = document.createElement('pre')
    this.#lineno    = document.createElement('pre')
    
    style.textContent = css
    container.classList.add('container')
    this.#pre.classList.add('pre')
    this.#lineno.classList.add('lineno')
    
    shadow.append(style, this.#lineno, container)
    container.append(this .#textarea, this.#pre)
    
    this.#update()
    
    this.#textarea.oninput = () => {
      this.#pre.innerText = this.#textarea.value
      this.#update()
    }
    
    // this.#textarea.onfocus = () => {
    //   this.dispatchEvent(new FocusEvent('focus'))
    // }
  }
  
  get value() {
    return this.#textarea.value
  }
  
  set value(s) {
    this.#textarea.value = s.text
    this.#pre.innerHTML = s
  }
  
  #update() {
    var text = this.value.split('\n').map((_, i) => i + 1).join('\n')
    this.#lineno.innerText = text
  }
}

customElements.define('sour-editor', SourEditor)