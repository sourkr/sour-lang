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
      const generic = type => type.kind == 'generic' ? gPair.get(type.name) : type
      
      const map = new Map(old_map.entries()
        .map(entry => [new ParamList(entry[0].params.map(param => new ParamType(param.name, generic(param.type)))), entry[1]])
        .map(entry => [entry[0], generic(entry[1])]))
      
      this.methods.set(name, map)
    })
  }
  
  isAssignableTo(type) {
    if(type.kind == 'instance') {
      if(this.class == type.class) return true
      if(this.class.extends) return this.class.extends.inAssignaleToInstance(type)
    }
    
    return type.kind == 'special' && type.type == 'any'
  }
  
  hasUnknown() {
    return this.class.hasUnknown()
  }
  
  has_method(name, args) {
    if (!args) return this.methods.has(name)
    if (!this.has_method(name)) return false
  
    return [...this.methods.get(name).keys()]
      .some(params => params.isAssignableTo(args))
  }
  
  get_method_index(name, args) {
    return [...this.methods.get(name).keys()]
      .map(params => params.isAssignableTo(args))
      .map((matched, index) => { return { matched, index } })
      .find(result => result.matched)
      .index ?? -1
  
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
}

export class FunctionType extends Type {
  constructor(params, returns) {
    super('function')
    
    this.params = params
    this.returns = returns
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
  
  toString() {
    return this.type
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
  
  hasUnknown() {
    return this.type.hasUnknown()
  }
  
  toString() {
    if(this.isOptional) return this.type.toString() + '?'
    if(this.isSpreaded) return '...' + this.type.toString()
    return this.type.toString()
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
  
  hasUnknown() {
    return this.params.some(param => param.hasUnknown())
  }
  
  toString() {
    return `(${this.params.join(', ')})`
  }
  
  clone() {
    return new ParamList([...this.params])
  }
}

export class GenricType extends Type {
  constructor(name) {
    super('generic')
    
    this.name = name
  }
  
  assign(type) {
    this.type = type
  }
  
  isAssignableTo(type) {
    return this.type.isAssignableTo(type)
  }
  
  toString() {
    return (this.type || this.name).toString()
  }
  
  clone() {
    return new GenricType(this.name)
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
  get_function_index(name, args) {
    return [...this.functions.get(name).keys()]
      .map(params => params.isAssignableTo(args))
      .map((matched, index) => { return { matched, index } })
      .find(result => result.matched)
      .index ?? -1
      
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