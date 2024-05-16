import { Validator } from '../sour-validator/validator.js';
import { BUILTIN } from './builtin.js';
import { BuiltinScope, Char, Float } from './scope.js';
import { Stream } from './stream.js';

const nums = [ 'byte', 'short', 'int', 'long' ]

export class Interprater {
  #global = new BuiltinScope()
  // #exports = new Scope()
  #file = 'main.sour'
  #root = '/'
  #imported
  
  stream = new Stream()
  
  constructor() {
    this.#global.define_function('print', (...args) => {
      this.stream.write(args.map(e=>e+"").join(' '))
    })
  }
  
  async interprate(root, file, imported = new Map()) {
    this.#root = root
    this.#file = file
    this.#imported = imported
    
    this.interprateCode(await (await fetch(new URL(file, root))).text())
  }
  
  async interprateCode(code) {
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
  
  async #interprateStmt(stmt, self = this.#global, local = this.#global, isExport = false) {
    if (stmt.type == 'err') this.#error(stmt)
    
    let value
    
    if (stmt.type == 'var') {
      if(stmt.val) value = this.#interprateExpr(stmt.val)
      
      this.#global.define_variable(stmt.name.value, stmt.val ? value : getDefault(stmt.valType))
    }
    
    if (stmt.type == 'const') this.#global.define_variable(stmt.name.value, this.#interprateExpr(stmt.val))
    
    await this.#interprateExpr(stmt, self, local)
  }
  
  async #interprateBody(body, self, local) {
    for(let stmt of body) {
      if(stmt.type == 'return') return await this.#interprateExpr(stmt.value, self)
      
      await this.#interprateStmt(stmt, self, local)
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
      return this.#global.get_variable(expr.value)
    }
    
    if(expr.type == 'call') {
      const args = expr.args.map(this.#interprateExpr.bind(this))
      this.#global.get_function(expr.access.value, expr.index)(...args)
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
  if(expr.type == 'ident') {
    if(nums.includes(expr.value)) return 0
    if(expr.value == 'float') return new Float(0)
    if(expr.value == 'double') return new Float(0)
    if(expr.value == 'bool') return false
    if(expr.value == 'char') return new Char(0)
  }
  
  return null
}