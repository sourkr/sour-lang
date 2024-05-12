export class Scope {
  symbols = new Map()
  parent
  
  constructor(parent) {
    this.parent = parent
  }
  
  define(name, value) {
    this.symbols.set(name, value)
  }
  
  set(name, value) {
    if(this.symbols.has(name)) this.symbols.set(name, value)
    else if(this.parent?.has(name)) this.parent.set(name, value)
    else this.symbols.set(name, value)
  }
  
  has(name) {
    return this.symbols.has(name) || this.parent?.has(name) || false
  }
  
  get(name) {
    if(this.symbols.has(name)) return this.symbols.get(name)
    if(this.parent) return this.parent.get(name)
  }
  
  deepClone() {
    const scope = new Scope()
    scope.symbols = new Map(this.symbols)
    scope.parent = this.parent?.deepClone()
    return scope
  }
  
  async toString() {
    const entries = [...this.symbols.entries()]
      .map(async ([key, value]) => {
        if(typeof value == 'function') return `${key}: <Function>`
        if(this === value) return `${key}: <This>`
        if(value instanceof Scope) return `${key}: ${await value.str()}`
        return `${key}: ${value}`
      })
    
    const awaited = await Promise.all(entries)
    
    return `{ ${awaited.join(', ')} }`
  }
  
  get all() {
    return Object.fromEntries(this.symbols)
  }
  
  async str() {
    if(this.has('str')) return await this.get('str')()
    return await this.toString()
  }
}

export class Class {
  interprate() {}
}