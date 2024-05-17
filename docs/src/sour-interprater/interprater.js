import { Validator } from '../sour-validator/validator.js';
import { BUILTIN } from './builtin.js';
import { BuiltinScope, Char, Float } from './scope.js';
import { Stream } from './stream.js';

const nums = [ 'byte', 'short', 'int', 'long' ]

export class Interprater {
  #global = BUILTIN
  // #exports = new Scope()
  #file = 'main.sour'
  #root = '/'
  #imported
  
  stream = new Stream()
  
  constructor() {
    this.#global.define_function('print', (...args) => {
      this.stream.write(args.map(e => {
        if(Array.isArray(e)) return `[${e}]`
        return e + ""
      }).join(' '))
    })
  }
  
  async interprate(root, file, imported = new Map()) {
    this.#root = root
    this.#file = file
    this.#imported = imported
    
    this.interprateCode(await (await fetch(new URL(file, root))).text())
  }
  
  interprateCode(code) {
    const validator = new Validator(code)
    const ast = validator.validate()
    // console.log(ast)
    if(ast.errors.length) {
      ast.errors.map(err => {
        if(!err.start) {
          const lines = code.split('\n')
          return `Error: ${err.msg} at (${code.length - 1}) ${lines.length}:${lines.at(-1).length}`
        }
        
        return `Error: ${err.msg} at (${err.start.index}) ${err.start.line}:${err.start.col}`
      }).forEach(this.stream.write.bind(this.stream))
      
      return
    }
    
    let stmt
    
    this.#interprateBody(ast.body)
  }
  
  #interprateStmt(stmt, self = this.#global, local = this.#global, isExport = false) {
    if (stmt.type == 'err') this.#error(stmt)
    
    if (stmt.type == 'var') {
      let value
      
      if(stmt.val) value = this.#interprateExpr(stmt.val)
      else value = getDefault(stmt.valType)
      
      this.#global.define_variable(stmt.name.value, value)
    }
    
    if (stmt.type == 'const') this.#global.define_variable(stmt.name.value, this.#interprateExpr(stmt.val))
    
    if (stmt.type == 'if') {
      if(this.#interprateExpr(stmt.condition)) this.#interprateBody(stmt.body)
      else this.#interprateBody(stmt.elseBody)
    }
    
    this.#interprateExpr(stmt, self, local)
  }
  
  #interprateBody(body) {
    for(let stmt of body) {
      if(stmt.type == 'return') return this.#interprateExpr(stmt.value, self)
      
      this.#interprateStmt(stmt)
    }
  }
  
  #interprateExpr(expr) {
    if(expr == null) return
    
    if(expr.type == 'str') return expr.val
    if(expr.type == 'int') return expr.val
    if(expr.type == 'float') return new Float(expr.val)
    if(expr.type == 'double') return new Float(expr.val)
    if(expr.type == 'char') return new Char(expr.val.charCodeAt(0))
    
    if(expr.type == 'ident') {
      const name = expr.value
      
      switch (name) {
        case 'true': return true
        case 'false': return false
      }
      
      return this.#global.get_variable(name)
    }
    
    if(expr.type == 'call') {
      const args = expr.args.map(this.#interprateExpr.bind(this))
      
      if(expr.access.type == 'dot') {
        const left = this.#interprateExpr(expr.access.left)
        return left.class.methods.get(expr.access.right.value)[expr.index](left, ...args)
      }
      
      this.#global.get_function(expr.access.value, expr.index)(...args)
    }
    
    if(expr.type == 'assign') {
      this.#global.set_variable(expr.name.value, this.#interprateExpr(expr.val))
    }
    
    if (expr.type == 'array') {
      const array = expr.values.map(this.#interprateExpr.bind(this))
      const cls = this.#global.classes.get('array')
      const instance = cls.instance()
      
      cls.methods.get('constructor')[0](instance, array)
      return instance
    }
    
    if (expr.type == 'dot') {
      const left = this.#interprateExpr(expr.left)
      return left.constants.get(expr.right.value)
    }
  }
  
  #error({ msg, start }) {
    throw new Error(`${msg} at (${start?.index}) ${start?.line}:${start?.col} in ${this.#file}`)
  }
}

function str(expr) {
  if(expr.type == 'ident') return expr.value
  if(expr.type == 'dot') return `${str(expr.left)}.${str(expr.right)}`
}

function getDefault(expr) {
  if(expr.type == 'instance') {
    const name = expr.name.value
    
    if(nums.includes(name)) return 0
    if(name == 'float') return new Float(0)
    if(name == 'double') return new Float(0)
    if(name == 'bool') return false
    if(name == 'char') return new Char(0)
  }
  
  return null
}