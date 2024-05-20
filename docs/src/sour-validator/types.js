const red = 'red'
const blue = 'dodgerblue'
const violet = 'slateblue'
const green = 'green'
const orange = 'orange'

export class Type {
  constructor(kind) {
    this.kind = kind
  }
  
  /**
   * @param type { Type }
   * @returns { boolean }
   */
  isAssignableTo(type) {
    return false
  }
  
  hasUnknown() {
    return true
  }
}

export class ClassType extends Type {
  constants = new Map()
  variables = new Map()
  methods = new Map()
  
  constructor(name, generic, extend) {
    super('class')
    
    this.name = name
    this.generic = generic
    this.extends = extend
  }
  
  isAssignableTo(type) {
    if(type.kind == 'class') return this.name == type.name
    return type.kind == 'special' && type.type == 'any'
  }
  
  inAssignaleToInstance(type) {
    if(type.kind != 'instance') return false
    if(type.class == this) return true
    if(this.extends) return this.extends.inAssignaleToInstance(type)
    return false
  }
  
  hasUnknown() {
    return this.name == 'unknown'
  }
  
  define_method(name, params, ret) {
    if(!this.methods.has(name))
      this.methods.set(name, new Map())
    
    this.methods.get(name).set(params, ret)
  }
  
  toString() {
    if(this.generic.length) return `class ${this.name}<${generic}>`
    return `class ${this.name}`
  }
}

export class InstanceType extends Type {
  constructor(cls, ...generic) {
    super('instance')
    
    this.class = cls
    this.generic = generic
    
    const gPair = new Map()
    cls.generic.forEach((name, index) => gPair.set(name, generic[index]))
    
    this.constants = new Map(cls.constants)
    this.variables = new Map(cls.variables)
    this.methods = new Map()
    
    cls.methods.forEach((old_map, name) => {
      const generic = type => type.kind == 'generic' ? type.assigned(gPair.get(type.name)) : type
      
      const map = new Map(old_map.entries()
        .map(entry => [
          new ParamList(entry[0].params.map(param => new ParamType(param.name, generic(param.type)))),
          generic(entry[1])
        ]))
      
      this.methods.set(name, map)
    })
  }
  
  isAssignableTo(type) {
    if(type.kind == 'instance') {
      if(this.class == type.class) return true
      if(this.class.extends) return this.class.extends.inAssignaleToInstance(type)
    }
    
    if(type.kind == 'generic') return this.isAssignableTo(type.type)
    
    return type.kind == 'special' && type.type == 'any'
  }
  
  equals(type) {
    return type.kind == 'instance' && type.cls == this.cls
  }
  
  has_method(name, args) {
    if (!args) return this.methods.has(name)
    if (!this.has_method(name)) return false
  
    return [...this.methods.get(name).keys()]
      .some(params => params.isAssignableTo(args))
  }
  
  get_method_params(name, args) {
    
    return [...this.methods.get(name).keys()]
      .find(params => params.isAssignableTo(args))
      .toString(true)
      
      // .map((matched, index) => { return { matched, index } })
      // .find(result => result.matched)
      // .index ?? -1
  
  }
  
  get_method(name, args) {
    return [...this.methods.get(name).entries()]
      .find(entry => entry[0].isAssignableTo(args))[1]
  }
  
  toString() {
    if(this.class.name == 'array') {
      return `${this.generic[0]}[]`
    }
    
    if(this.class.generic.length)
      return `${this.class.name}<${this.generic}>`
    
    return this.class.name
  }
  
  toHTML() {
    return `<span style="color:${red}">${this.class.name}</span>`
  }
}

export class FunctionType extends Type {
  constructor(name, params, ret) {
    super('function')
    
    this.name = name
    this.params = params
    this.ret = ret
  }
  
  isAssignableTo(type) {
    if(type.kind != 'function') return false
    
  }
  
  isParamsAssignableTo(args) {
    if(args.length != this.params.length) return false
    
    for(let i = 0; i < this.params.length; i++) {
      if(!args[i].isAssignableTo(this.params[i])) return false
    }
    
    return true
  }
  
  toParamsString() {
    return `(${this.params.join(',')})`
  }
  
  toHTML() {
    return `<span style="color:${red}">fun</span> <span style="color:${blue}">${this.name}</span>${this.params.toHTML()}: ${this.ret.toHTML()}`
  }
}

export class SpecialType extends Type {
  constructor(type) {
    super('special')
    
    this.type = type
  }
  
  isAssignableTo(type) {
    if(this.type == 'any')
      return !(type.kind == 'special' && type.type == 'void')
    
    return type.kind == 'special' && type.type == this.type
  }
  
  equals(type) {
    return type.kind = 'special' && type.type == this.type
  }
    
  toString() {
    return this.type
  }
  
  toHTML() {
    return `<span style="color:${red}">${this.type}</span>`
  }
}

export class ParamType extends Type {
  isOptional = false
  isSpreaded = false
  
  /**
   * @param name { string }
   * @param type { Type }
   */
  constructor(name, type) {
    super('param')
    
    this.name = name
    this.type = type
  }
  
  // /** @param arg { Type } */
  // isAssignableTo(arg) {
  //   return arg.isAssignableTo(this.type)
  // }
  
  equals(type) {
    return type.kind == 'param' && type.type.equals(this.type)
  }
  
  hasUnknown() {
    return this.type.hasUnknown()
  }
  
  toString(generic) {
    if(this.isOptional) return this.type.toString(generic) + '?'
    if(this.isSpreaded) return '...' + this.type.toString(generic)
    return this.type.toString(generic)
  }
  
  toHTML() {
    const base = `<span style="color:${orange}">${this.name}</span>: ${this.type.toHTML()}`
    return this.isSpreaded ? `...${base}` : base
  }
}

export class ParamList extends Type {
  /** @param params { ParamType[] } */
  constructor(params) {
    super('params')
    
    this.params = params
  }
  
  /** @param argList { Type[] } */
  isAssignableTo(argList) {
    const argsPair = new Map()
    const args = [...argList]
    const params = [...this.params]
    
    while (args.length) {
      const arg = args.shift()
      const param = params.shift()
      
      if(!param) return false
      if(param.isSpreaded) params.unshift(param)
      
      if(!arg.isAssignableTo(param.type)) return false
    }
    
    while (params.length) {
      const param = params.shift()
      if(param.isOptional) continue
      if(param.isSpreaded) continue
      return false
    }
    
    return true
  }
  
  equals(type) {
    return type.kind == 'params' && this.params.every((param, index) => param.equals(type.params.at(index)))
  }
  
  hasUnknown() {
    return this.params.some(param => param.hasUnknown())
  }
  
  toString(generic) {
    return `(${this.params.map(e => e.toString(generic)).join(',')})`
  }
  
  toHTML() {
    return `(${this.params.map(e => e.toHTML()).join(', ')})`
  }
}

export class GenricType extends Type {
  constructor(name) {
    super('generic')
    
    this.name = name
  }
  
  assigned(type) {
    const g = new GenricType(this.name)
    g.type = type
    return g
  }
  
  isAssignableTo(type) {
    return this.type.isAssignableTo(type)
  }
  
  toString(generic) {
    if(generic) return this.name
    return (this.type || this.name).toString()
  }
}

export const VOID = new SpecialType('void')
export const ANY = new SpecialType('any')


export class BuiltinScope {
  /** @type { Map<string, Type> } */
  constants = new Map()
  
  /** @type { Map<string, Type> } */
  variables = new Map()
  
  /** @type { Map<string, Map<ParamList, Type>> } */
  functions = new Map()
  
  /** @type { Map<string, ClassType> } */
  classes = new Map()
  
  /**
   * @param name { string }
   * @param type { Type }
   */
  define_constant(name, type) {
    this.constants.set(name, type)
  }
  
  /** @param name { string } */
  has_constant(name) {
    return this.constants.has(name)
  }
  
  /** @param name { string } */
  get_constant(name) {
    return this.constants.get(name)
  }
  
  /**
   * @param name { string }
   * @param type { Type }
   */
  define_variable(name, type) {
    this.variables.set(name, type)
  }
  
  has(name) {
    return this.has_constant(name)
      || this.has_variable(name)
      || this.has_function(name)
      || this.has_class(name)
  }
  
  /** @param name { string } */
  has_variable(name) {
    return this.variables.has(name)
  }
  
  /** @param name { string } */
  get_variable(name) {
    return this.variables.get(name)
  }
  
  /**
   * @param name { string }
   * @param params { ParamList }
   * @param type { Type }
   */
  define_function(name, params, ret) {
    if(!this.functions.has(name))
      this.functions.set(name, new Map())
    
    this.functions.get(name).set(params, ret)
  }
  
  /**
   * @param name { string }
   * @param [args] { Type[] }
   */
  has_function(name, args) {
    if(!args) return this.functions.has(name)
    if(!this.has_function(name)) return false
    
    return [...this.functions.get(name).keys()]
      .some(params => params.isAssignableTo(args))
  }
  
  has_same_fun(name, params) {
    if(!this.has_function(name)) return false
    return [...this.functions.get(name).keys()]
      .some(p => p.equals(params))
  }
  
  /** 
   * @param name { string }
   * @param args { Type[] }
   */
  get_function(name, args) {
    return [...this.functions.get(name).entries()]
      .find(entry => entry[0].isAssignableTo(args))[1]
  }
  
  /**
   * @param name { string }
   * @param [args] { Type[] }
   */
  get_function_params(name, args) {
    return [...this.functions.get(name).keys()]
      .find(params => params.isAssignableTo(args))
      .toString(true)
      // .map((matched, index) => { return { matched, index } })
      // .find(result => result.matched)
      // .index ?? -1
      
  }
  
  /** @param name { string } */
  get_functions(name) {
    return this.functions.get(name)
  }
  
  /**
   * @param name { string }
   * @param cls { ClassType }
   */
  define_class(name, cls) {
    this.classes.set(name, cls)
  }
  
  /** @param name { string } */
  get_class(name) {
    return this.classes.get(name)
  }
  
  /** @param name { string } */
  has_class(name) {
    return this.classes.has(name)
  }
}
