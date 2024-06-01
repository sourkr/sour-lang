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
    this.vars.set(name, value)
  }
  
  get_var(name) {
    return this.vars.get(name)
  }
  
  get_meth(name, params) {
    return this.class.meths.get(name).get(params)
  }
  
  toString() {
    return this.get_meth('str', '()')(this)
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
  constructor(global, self) {
    this.global = global
    this.self = self
  }
  
  get_var(name) {
    return this.self.get_var(name)
  }
}