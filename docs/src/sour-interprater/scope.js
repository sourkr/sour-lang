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

export class BuiltinScope {
  /** @type { Map<String, any> } */
  variables = new Map()
  
  /** @type { Map<String, ((...args: any[]) => any)[]> } */
  functions = new Map()
  
  /**
   * @param name { string }
   * @param value { any }
   */
  define_variable(name, value) {
    this.variables.set(name, value)
  }
  
  /** @param name { string } */
  get_variable(name) {
    return this.variables.get(name)
  }
  
  /**
   * @param name { string }
   * @param value { any }
   */
  set_variable(name, value) {
    this.variables.set(name, value)
  }
  
  
  /** 
   * @param name { string }
   * @param fun { (...args: any[]) => any }
   */
  define_function(name, fun) {
    if(!this.functions.has(name)) this.functions.set(name, [])
    this.functions.get(name).push(fun)
  }
  
  /** 
   * @param name { string }
   * @param index { number }
   */
  get_function(name, index) {
    return this.functions.get(name)[index]
  }
}

export class Float {
  constructor(val) {
    this.value = val
  }
  
  toString() {
    return Number.isInteger(this.value) ? this.value + '.0' : this.value
  }
}

export class Char {
  constructor(val) {
    this.value = val
  }
  
  toString() {
    return String.fromCharCode(this.value)
  }
}