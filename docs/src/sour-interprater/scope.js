export class Class {
  vars = new Map()
  meths = new Map()
  
  instance() {
    return new Instance(this)
  }
  
  // vars
  def_var(name, expr) {
    this.vars.set(name, expr)
  }
  
  get_vars() {
    return this.vars
  }
  
  def_meth(name, params, fun) {
    if (!this.meths.has(name)) this.meths.set(name, new Map())
    this.meths.get(name).set(params, fun)
  }
}

export class Instance {
  vars = new Map()
  
  constructor(cls) {
    this.class = cls
  }
  
  // vars
  set_var(name, value) {
    // console.log(name, value)
    this.vars.set(name, value)
  }
  
  get_var(name) {
    return this.vars.get(name)
  }
  
  has_meth(name, params) {
    return this.class.meths.get(name)?.has(params)
  }
  
  get_meth(name, params) {
    // console.log(Object.fromEntries(this.class.meths.get(name)))
    return this.class.meths.get(name).get(params)
  }
  
  toString() {
    if(!this.has_meth('str', '()')) return `[object Object]`
    return this.get_meth('str', '()')(this).value
  }
}


export class BuiltinScope {
  vars = new Map()
  funs = new Map()
  classes = new Map()
  
  def_var(name, value) {
    this.vars.set(name, value)
  }
  
  get_var(name) {
    return this.vars.get(name)
  }
  
  set_var(name, value) {
    this.vars.set(name, value)
  }
  
  
  def_fun(name, params, fun) {
    if(!this.funs.has(name)) this.funs.set(name, new Map())
    this.funs.get(name).set(params, fun)
  }
  
  get_fun(name, params) {
    // console.log({ name, params })
    return this.funs.get(name).get(params)
  }
}

export class GlobalScope {
  vars = new Map()
  funs = new Map()
  classes = new Map()
  
  constructor(builtins) {
    this.builtins = builtins
  }
  
  // vars
  def_var(name, val) {
    this.vars.set(name, val)
  }
  
  get_var(name) {
    return this.vars.get(name)
  }
  
  
  // funs
  def_fun(name, params, fun) {
    this.builtins.def_fun(name, params, fun)
  }
  
  get_fun(name, params) {
    return this.builtins.get_fun(name, params)
  }
  
  
  // classes
  def_class(name, cls) {
    this.classes.set(name, cls)
  }
  
  get_class(name) {
    return this.classes.get(name)
  }
}

export class MethodScope {
  vars = new Map()
  
  constructor(global, self) {
    this.global = global
    this.self = self
  }
  
  def_var(name, value) {
    this.vars.set(name, value)
  }
  
  get_var(name) {
    return this.vars.get(name)
      || this.self.get_var(name)
  }
  
  set_var(name, value) {
    if(this.vars.has(name))
      this.vars.set(name, value)
    else this.self.set_var(name, value)
  }
  
  // meths
  has_meth(name, params) {
    return this.self.has_meth(name, params)
  }
  
  get_meth(name, params) {
    return this.self.get_meth(name, params)
  }
}