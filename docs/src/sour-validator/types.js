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
  fields = new Map()
  meths = new Map()
  
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
  
  def_field(name, type) {
    // console.log(type)
    this.fields.set(name, type)
  }
  
  def_meth(name, params, ret) {
    if(!this.meths.has(name))
      this.meths.set(name, new Map())
    
    this.meths.get(name).set(params, ret)
  }
  
  toString() {
    if(this.generic.length) return `class ${this.name}<${generic}>`
    return `class ${this.name}`
  }
  
  toHTML() {
    return 
  }
}

export class InstanceType extends Type {
  constructor(cls, ...generic) {
    super('instance')
    
    this.class = cls
    this.generic = generic
    
    const gPair = new Map()
    cls.generic.forEach((name, index) => gPair.set(name, generic[index]))
    
    this.fields = new Map([...cls.fields])
    this.meths = new Map()
    
    cls.meths.forEach((old_map, name) => {
      const generic = type => type.kind == 'generic' ? type.assigned(gPair.get(type.name)) : type
      
      const map = new Map([...old_map.entries()]
        .map(entry => [
          new ParamList(entry[0].params.map(param => new ParamType(param.name, generic(param.type)))),
          generic(entry[1])
        ]))
      
      this.meths.set(name, map)
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
  
  // fields
  has_field(name) {
    return this.fields.has(name)
  }
  
  get_field(name) {
    return this.fields.get(name)
  }
  
  get_fields() {
    return this.fields
  }
  
  // meth
  has_meth(name, args) {
    if (!args) return this.meths.has(name)
    if (!this.has_meth(name)) return false
  
    return [...this.meths.get(name).keys()]
      .some(params => params.isAssignableTo(args))
  }
  
  get_meth_params(name, args) {
    return [...this.meths.get(name).keys()]
      .find(params => params.isAssignableTo(args))
      .toString(true)
  }
  
  get_meth(name, args) {
    return [...this.meths.get(name).entries()]
      .find(entry => entry[0].isAssignableTo(args))[1]
  }
  
  get_meths(name) {
    if(name) return this.meths.get(name)
    return this.meths
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

export class MethodType extends Type {
  constructor(cls, name, params, ret) {
    super('method')
    
    this.class = cls
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
    return `<span style="color:${red}">fun</span> ${this.class.name}.<span style="color:${blue}">${this.name}</span>${this.params.toHTML()}: ${this.ret.toHTML()}`
  }
}

export class SpecialType extends Type {
  constructor(type, info) {
    super('special')
    
    this.type = type
    this.info = info
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
      
      if(!arg.isAssignableTo?.(param.type)) return false
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

export class VarType extends Type {
  constructor(name, type) {
    super('var')
    
    this.name = name
    this.type = type
  }
  
  toHTML() {
    return `<span style="color:${red}">var</span> ${this.name}: ${this.type?.toHTML()}`
  }
}

export class ConstType extends Type {
  constructor(name, type) {
    super('const')
    
    this.name = name
    this.type = type
  }
  
  toHTML() {
    return `<span style="color:${red}">const</span> ${this.name}: ${this.type?.toHTML?.()}`
  }
}


export const VOID = new SpecialType('void')
export const ANY = new SpecialType('any')


export class BuiltinScope {
  consts = new Map()
  vars = new Map()
  funs = new Map()
  classes = new Map()
  
  define_const(name, type) {
    this.consts.set(name, type)
  }
  
  has_const(name) {
    return this.consts.has(name)
  }
  
  get_const(name) {
    return this.consts.get(name)
  }
  
  define_var(name, type) {
    this.vars.set(name, type)
  }
  
  
  has_var(name) {
    return this.vars.has(name)
  }
  
  get_var(name) {
    return this.vars.get(name)
  }
  
  // funs
  define_fun(name, params, ret) {
    if(!this.funs.has(name))
      this.funs.set(name, new Map())
    
    this.funs.get(name).set(params, ret)
  }
  
  has_fun(name, args) {
    if(!args) return this.funs.has(name)
    if(!this.has_fun(name)) return false
    
    return [...this.funs.get(name).keys()]
      .some(params => params.isAssignableTo(args))
  }
  
  has_same_fun(name, params) {
    if(!this.has_function(name)) return false
    return [...this.funs.get(name).keys()]
      .some(p => p.equals(params))
  }
  
  get_fun(name, args) {
    return [...this.funs.get(name).entries()]
      .find(entry => entry[0].isAssignableTo(args))[1]
  }
  
  get_fun_params(name, args) {
    return [...this.funs.get(name).keys()]
      .find(params => params.isAssignableTo(args))
      .toString(true)
      // .map((matched, index) => { return { matched, index } })
      // .find(result => result.matched)
      // .index ?? -1
      
  }
  
  get_funs(name) {
    if(!name) return this.funs
    return this.funs.get(name)
  }
  
  define_class(name, cls) {
    this.classes.set(name, cls)
  }
  
  get_class(name) {
    return this.classes.get(name)
  }
  
  has_class(name) {
    return this.classes.has(name)
  }
  
  has(name) {
    return this.has_const(name)
      || this.has_var(name)
      || this.has_fun(name)
      || this.has_class(name)
  }
  
}

export class GlobalScope {
  #builins
  
  consts = new Map()
  vars = new Map()
  classes = new Map()
  
  constructor(builins) {
    this.#builins = builins
  }
  
  // consts
  def_const(name, type) {
    this.consts.set(name, type)
  }
  
  has_const(name) {
    return this.consts.has(name)
  }
  
  get_const(name) {
    return this.consts.get(name)
  }
  
  // vars
  def_var(name, type) {
    this.vars.set(name, type)
  }
  
  has_var(name) {
    return this.vars.has(name)
  }
  
  get_var(name) {
    return this.vars.get(name)
  }
  
  get_vars() {
    return this.vars
  }
  
  
  // funs
  has_fun(name, args) {
    return this.#builins.has_fun(name, args)
  }
  
  get_fun_params(name, args) {
    return this.#builins.get_fun_params(name, args)
  }
  
  get_fun(name, args) {
    return this.#builins.get_fun(name, args)
  }
  
  get_funs(name) {
    return this.#builins.get_funs(name)
  }
  
  
  // classes
  def_class(name, cls) {
    return this.classes.set(name, cls)
  }
  
  has_class(name) {
    return this.classes.has(name)
      || this.#builins.has_class(name)
  }
  
  get_class(name) {
    return this.classes.get(name)
      || this.#builins.get_class(name)
  }
  
  get_classes() {
    return new Map([
      ...this.#builins.classes,
      ...this.classes
    ])
  }
  
  
  // all
  has(name) {
    return this.has_class(name)
      || this.#builins.has(name)
  }
}

export class MethodScope {
  consts = new Map()
  vars = new Map()
  
  constructor(global, self) {
    this.global = global
    this.self = self
    
    this.consts.set('this', self)
  }
  
  // consts
  def_const(name, value) {
    this.consts.set(name, value)
  }
  
  has_const(name) {
    return this.consts.has(name)
  }
  
  get_const(name) {
    return this.consts.get(name)
  }
  
  get_consts() {
    return this.consts
  }
  
  
  // vars
  def_var(name, value) {
    this.vars.set(name, value)
  }
  
  has_var(name) {
    return this.vars.has(name)
      || this.global.has_var(name)
  }
  
  get_var(name) {
    return this.vars.get(name)
      || this.global.get_var(name)
  }
  
  get_vars(name) {
    return new Map([
      ...this.vars,
      ...this.global.get_vars()
    ])
  }
  
  
  // fields
  has_field(name) {
    return this.self.has_field(name)
  }
  
  get_field(name) {
    return this.self.get_field(name)
  }
  
  get_fields() {
    return this.self.get_fields()
  }
  
  
  // meths
  has_meth(name, args) {
    return this.self.has_meth(name, args)
  }
  
  get_meth_params(name, args) {
    return this.self.get_meth_params(name, args)
  }
  
  get_meth(name, args) {
    return this.self.get_meth(name, args)
  }
  
  get_meths(name) {
    return this.self.get_meths(name)
  }
  
  
  // funs
  has_fun(name) {
    return this.global.has_fun(name)
  }
  
  get_fun_params(name, args) {
    return this.global.get_fun_params(name, args)
  }
  
  get_fun(name, args) {
    return this.global.get_fun(name, args)
  }
  
  // all
  has(name) {
    return this.has_const(name)
      || this.has_var(name)
      || this.has_field(name)
      || this.has_meth(name)
  }
}