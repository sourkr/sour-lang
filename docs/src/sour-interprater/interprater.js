import { Validator } from '../sour-validator/validator.js';
import { BUILTIN, byte, int, str } from './builtin.js';
import { GlobalScope, MethodScope, Class } from './scope.js';
import { Stream } from './stream.js';

const nums = [ 'byte', 'short', 'int', 'long' ]

export class Interprater {
  #global = new GlobalScope(BUILTIN)
  // #exports = new Scope()
  #file = 'main.sour'
  #root = '/'
  #imported
  
  stream = new Stream()
  
  constructor() {
    this.#global.def_fun('print', '(...any)', (...args) => {
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
  
  #interprateStmt(stmt, scope) {
    if (stmt.type == 'err') this.#error(stmt)
    
    if (stmt.type == 'var') {
      let value
      
      if(stmt.val) value = this.#interprateExpr(stmt.val, scope)
      else value = getDefault(stmt.valType)
      
      scope.def_var(stmt.name.value, value)
    }
    
    if (stmt.type == 'const') {
      scope.def_var(stmt.name.value, this.#interprateExpr(stmt.val, scope))
    }
    
    if (stmt.type == 'class') {
      const name = stmt.name.value
      const cls = new Class()
      this.#global.def_class(name, cls)
      
      stmt.body.forEach(stmt => {
        const name = stmt.name.value
        
        if(stmt.type == 'var') {
          cls.def_var(name, stmt.val)
        }
        
        if(stmt.type == 'const') {
          cls.def_var(name, stmt.val)
        }
        
        if (stmt.type == 'fun') {
          cls.def_meth(name, stmt.param, (self, ...args) => {
            const mScope = new MethodScope(this.#global, self)
            
            mScope.def_var('this', self)
            stmt.paramList.params.forEach((param, index) => mScope.def_var(param.name, args[index]))
            
            return this.#interprateBody(stmt.body, mScope)
          })
        }
      })
    }
    
    if (stmt.type == 'if') {
      if(this.#interprateExpr(stmt.condition).value) this.#interprateBody(stmt.body)
      else this.#interprateBody(stmt.elseBody)
    }
    
    if (stmt.type == 'while') {
      while (this.#interprateExpr(stmt.condition).value)
        this.#interprateBody(stmt.body)
    }
    
    if (stmt.type == 'for') {
      this.#interprateStmt(stmt.initialisation)
      
      let i = 0
          
      while (this.#interprateExpr(stmt.condition).value) {
        this.#interprateBody(stmt.body)
        this.#interprateExpr(stmt.incrementation)
        i++
        
        if(i >= 20) return
      }
    }
    
    if (stmt.type == 'fun') {
      this.#global.def_fun(stmt.name.value, stmt.params, (...args) => {
        this.#interprateBody(stmt.body)
      })
    }
    
    this.#interprateExpr(stmt, scope)
  }
  
  #interprateBody(body, scope = this.#global) {
    for(let stmt of body) {
      if(stmt.type == 'ret') return this.#interprateExpr(stmt.val, scope)
      this.#interprateStmt(stmt, scope)
    }
  }
  
  #interprateExpr(expr, scope) {
    if (expr == null) return
    
    if (expr.type == 'str') return str(expr.val)
    if (expr.type == 'float') return float(expr.val)
    if (expr.type == 'int') return int(expr.val)
    if (expr.type == 'char') return new Char(expr.val.charCodeAt(0))
    
    if (expr.type == 'ident') {
      const name = expr.value
      
      switch (name) {
        case 'true': return true
        case 'false': return false
      }
      
      return scope.get_var(name)
    }
    
    if (expr.type == 'call') {
      const args = expr.args.map(arg => this.#interprateExpr(arg, scope))
      
      if(expr.access.type == 'dot') {
        const left = this.#interprateExpr(expr.access.left, scope)
        return left.get_meth(expr.access.right.value, expr.param)(left, ...args)
      }
      
      const name = expr.access.value
      
      if(scope.has_meth?.(name, expr.param)) return scope.get_meth(name, expr.param)(scope.self, ...args)
      else return scope.get_fun?.(name, expr.param)(...args)
    }
    
    if (expr.type == 'assign') {
      const value = this.#interprateExpr(expr.val, scope)
      
      if(expr.access.type == 'dot') {
        const left = this.#interprateExpr(expr.access.left, scope)
        left.set_var(expr.access.right.value, value)
        return
      }
      
      scope.set_var(expr.access.value, value)
    }
    
    if (expr.type == 'array') {
      const array = expr.values.map(this.#interprateExpr.bind(this))
      const cls = this.#global.classes.get('array')
      const instance = cls.instance()
      
      instance.get_method('constructor', '')(instance, array)
      return instance
    }
    
    if (expr.type == 'dot') {
      const left = this.#interprateExpr(expr.left, scope)
      return left.get_var(expr.right.value)
    }
    
    if (expr.type == 'op') {
      const left = this.#interprateExpr(expr.left, scope)
      const right = this.#interprateExpr(expr.right, scope)
      const result = left.get_meth(expr.name, expr.params)(left, right)
      
      if (expr.isEquals) {
        if('<>'.includes(expr.operator.value)) {
          if(result.value) return result
          return left.get_meth('equals', expr.eqParams)(left, right)
        }
        
        scope.set_var(expr.left.value, result)
      }
      
      return result
    }
    
    if (expr.type == 'as') {
      const name = expr.castType.name.value
      const value = this.#interprateExpr(expr.expr)
      
      if (name == 'byte') return byte(value.value)
      if (name == 'int') return int(value.value)
    }
    
    if (expr.type == 'neg') {
      const val = this.#interprateExpr(expr.val)
      return val.get_method('negative', '()')(val)
    }
    
    if (expr.type == 'new') {
      const name = expr.name.value
      const cls = this.#global.get_class(name)
      const ins = cls.instance()
      
      cls.get_vars().forEach((expr, name) => ins.set_var(name, this.#interprateExpr(expr)))
      
      // console.log(ins.get_meth('constructor', expr.param))
      const args = expr.args.map(arg => this.#interprateExpr(arg, scope))
      
      if(expr.param)
        ins.get_meth('constructor', expr.param)(ins, ...args)
      
      return ins
    }
  }
  
  #error({ msg, start }) {
    throw new Error(`${msg} at (${start?.index}) ${start?.line}:${start?.col} in ${this.#file}`)
  }
}

function getDefault(expr) {
  if(expr.type == 'instance') {
    const name = expr.name.value
    
    if(name == 'byte') return byte(0)
    if(name == 'int') return int(0)
    
    if(name == 'float') return new Float(0)
    if(name == 'double') return new Float(0)
    if(name == 'bool') return false
    if(name == 'char') return new Char(0)
  }
  
  return null
}