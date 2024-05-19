export class Stylable {
  #styles = []
  
  #text
  
  constructor(text) {
    this.#text = text
    this.#styles.push(new Style(0, text.length))
  }
  
  apply(style) {
    this.#check(style)
  }
  
  #check(n) {
    // console.log(n)
    for(let i = 0; i < this.#styles.length; i++) {
      const o = this.#styles[i]
      
      // if(n.start < o.start && n.end <= o.start) {
      //   this.#styles.splice(i, 0, n)
      //   return
      // }
      
      if(n.start == o.start && n.end < o.end) {
        n.style = Style.mix(n, o)
        this.#styles.splice(i, 0, n)
        o.start = n.end
        // this.#check(new Style(o.end, n.end, n.style))
        return
      }
      
      if (n.start == o.start && n.end > o.end) {
        this.#check(new Style(n.start, o.end, n.style))
        this.#check(new Style(o.end, n.end, n.style))
        return
      }
      
      if(n.start > o.start && n.end < o.end) {
        const end = o.end
        o.end = n.start
        n.style = Style.mix(o, n)
        
        this.#styles.splice(i + 1, 0, new Style(n.end, end, o.style))
        this.#styles.splice(i + 1, 0, n)
        return
      }
      
      if(n.start > o.start && n.end == o.end) {
        const end = o.end
        o.end = n.start
        n.style = Style.mix(o, n)
        this.#styles.splice(i + 1, 0, n)
        return
      }
      
      if (n.start == o.start && n.end == o.end) {
        o.style = Style.mix(o, n)
        return
      }
    }
    
    // this.#styles.push(color)
  }
  
  get text() {
    return this.#text
  }
  
  toString() {
    return this.#styles
      .map(c => c.toString(this.#text))
      .join('')
  }
}

export class Style {
  constructor(start, end, style = {}) {
    this.start = start
    this.end = end
    this.style = style
  }
  
  toString(str) {
    const text = str.substring(this.start, this.end)
    const entries = Object.entries(this.style)
    if (entries.length) return `<span style="${entries.map(entry => `${entry[0]}:${entry[1]}`).join(';')}">${text}</span>`
    return text
  }
  
  static mix(a, b) {
    return { ...a.style, ...b.style }
  }
}

export class Color extends Style {
  constructor(start, end, color) {
    super(start, end)
    this.style.color = color
  }
}

export class Error extends Style {
  constructor(start, end) {
    super(start, end)
    this.style['text-decoration'] = 'underline wavy red'
  }
}