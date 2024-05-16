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
}

export class ClassType extends Type {
  constructor(name, extend) {
    super('class')
    
    this.name = name
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
  
  toString() {
    return `class ${this.name}`
  }
}

export class InstanceType extends Type {
  constructor(cls) {
    super('instance')
    
    this.class = cls
    
  }
  
  isAssignableTo(type) {
    if(type.kind == 'instance') {
      if(this.class == type.class) return true
      if(this.class.extends) return this.class.extends.inAssignaleToInstance(type)
    }
    
    if(type instanceof ParamType) {
      return this.isAssignableTo(type.type)
    }
    
    return type.kind == 'special' && type.type == 'any'
  }
  
  toString() {
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
      
      if(!arg.isAssignableTo(param)) return false
    }
    
    while (params.length) {
      const param = params.shift()
      if(param.isOptional) continue
      if(param.isSpreaded) continue
      return false
    }
    
    return true
  }
  
  toString() {
    return `(${this.params.join(', ')})`
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