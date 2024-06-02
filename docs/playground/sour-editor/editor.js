const keyComp = Symbol('comp')

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
    overflow: scroll;
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
  
  .list {
    display: inline-block;
    pointer-events: auto;
    box-shadow: 0 0 1px lightgrey;
    height: fit-content;
    background: white;
    
    & div {
      padding-inline: 5px;
    }
  }
  
  .info {
    display: inline-block;
    pointer-events: auto;
    box-shadow: 0 0 1px lightgrey;
    padding: 5px;
    background: white;
    border-radius: 10px;
  }
  
  .completion {
    display: flex;
    position: absolute;
    width: calc(100% - 20px);
    top: 0;
    margin: 10px;
    pointer-events: none;
    flex-direction: row;
    justify-content: center;
    gap: 10px;
  }
`)

export class SourEditor extends HTMLElement {
  #root
  #textarea
  #pre
  #lineno
  #completion
  #list
  #info
  #container
  
  constructor() {
    super()

    this.#root = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    this.#container = document.createElement('div')
    this.#completion = document.createElement('div')
    
    this.#textarea  = document.createElement('textarea')
    this.#pre       = document.createElement('pre')
    this.#lineno    = document.createElement('pre')
    
    this.#list = document.createElement('div')
    this.#info = document.createElement('div')
    
    style.textContent = css
    this.#container.classList.add('container')
    this.#completion.classList.add('completion')
    
    this.#pre.classList.add('pre')
    this.#lineno.classList.add('lineno')
    
    this.#list.classList.add('list')
    this.#info.classList.add('info')
    
    this.#root.append(style, this.#lineno, this.#container, this.#completion)
    this.#container.append(this .#textarea, this.#pre)
    this.#completion.append(this.#list, this.#info)
    
    this.#update()
    
    this.#textarea.oninput = () => {
      this.#pre.innerText = this.#textarea.value
      this.#update()
    }
    
    this.#textarea.onkeydown = ev => {
      if(ev.key == 'ArrowDown' && this.selected != -1) {
        this.selected++
        if(this.selected == -1) this.selected = 0
        ev.preventDefault()
      }
      
      if (ev.key == 'ArrowUp') {
        
        if(this.selected != -1) {
          this.selected--
          if (this.selected == -1) this.selected = this.#list.childElementCount - 1
          ev.preventDefault()
        } else if(this.current_index == 0) {
          ev.preventDefault()
        }
      }
      
      if (ev.key == 'Enter' && this.selected != -1) {
        const comp = this.#list.children.item(this.selected)[keyComp]
        const index = this.current_index
        const left = this.value.substring(0, index)
        const right = this.value.substring(index)
        
        this.value = left + comp.sufix + right
        this.current_index = index + comp.sufix.length
        
        this.dispatchEvent(new InputEvent('input'))
        
        ev.preventDefault()
      }
      
      this.#completion.style.top = this.cursor_y + 'px'
    }
  }
  
  showInfo(info) {
    this.#info.style.display = 'inline-block'
    this.#info.innerHTML = info
  }
  
  showCompletion(list) {
    this.#list.innerHTML = ''
    
    if(!list.length) this.#info.style.display = 'none'
    
    list.forEach(completion => {
      const item = document.createElement('div')
      item.innerHTML = completion.name
      item[keyComp] = completion
      this.#list.append(item)
    })
    
    this.selected = 0
  }
  
  get selected() {
    const children = [...this.#list.children]
    if (children.length == 0) return -1
    
    return children.findIndex(item => item.style.background == 'lightgrey')
  }
  
  set selected(index) {
    this.#list.childNodes.forEach((item, i) => {
      item.style.background = index == i ? 'lightgrey' : 'transparent'
      if(i == index) {
        this.showInfo(item[keyComp].details)
      }
    })
  }
  
  get value() {
    return this.#textarea.value
  }
  
  set value(s) {
    this.#textarea.value = s.text || s
    this.#pre.innerHTML = s
    this.#update()
  }
  
  get current_index() {
    return this.#textarea.selectionStart
  }
  
  set current_index(index) {
    this.#textarea.selectionStart = index
    this.#textarea.selectionEnd = index
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
    
    const preWidth = parseFloat(getComputedStyle(this.#pre).width) + 10
    const containerWidth = parseFloat(getComputedStyle(this.#container).width)
    this.#textarea.style.width = (preWidth > containerWidth ? preWidth : containerWidth) + 'px'
  }
}


customElements.define('sour-editor', SourEditor)