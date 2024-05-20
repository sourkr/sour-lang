import { DefinationParser } from '../sour-parser/def-parser.js';
import { BuiltinScope, ParamType, ParamList, ClassType, InstanceType, GenricType, ANY, VOID } from './types.js';

export class DefinationValidator {
  #global = new BuiltinScope()
  #parser
  
  constructor(input) {
    this.#parser = new DefinationParser(input)
  }
  
  validate() {
    const classes = []
    const body = []
    
    this.#parser.forEach(stmt => {
      // console.log(stmt)
      if(stmt.type == 'class') {
        const name = stmt.name.name.value
        const generic = stmt.name.generic.map(ident => ident.value)
        const cls = new ClassType(name, generic)
        
        classes.push(stmt)
        this.#global.define_class(name, cls)
        return
      }
      
      body.push(stmt)
    })
    
    classes.forEach(stmt => {
      const cls = this.#global.get_class(stmt.name.name.value)
      const generic = cls.generic
      
      stmt.body.forEach(stmt => {
        if (stmt.type == 'const') cls.constants.set(stmt.name.value, this.#checkType(stmt.value))
        if (stmt.type == 'var') cls.variables.set(stmt.name.value, this.#checkType(stmt.value))
      
        if (stmt.type == 'fun') {
          const name = stmt.name.value
      
          const params = new ParamList(stmt.params.map(param => {
            const type = new ParamType(param.name.value, this.#checkType(param.type, generic))
            type.isOptional = param.isOptional
            type.isSpreaded = param.isSpreaded
            return type
          }))
      
          const ret = this.#checkType(stmt.ret, generic)
      
          cls.define_method(name, params, ret)
        }
      })
    })
    
    body.forEach(this.#checkStmt.bind(this))
    
    return this.#global
  }
  
  next() {
    return this.#checkStmt(this.#parser.next())
  }
  
  #checkStmt(stmt) {
    if(stmt.type == 'fun') {
      const name = stmt.name.value
      
      const params = new ParamList(stmt.params.map(param => {
        const type = new ParamType(param.name.value, this.#checkType(param.type))
        type.isOptional = param.isOptional
        type.isSpreaded = param.isSpreaded
        return type
      }))
      
      const ret = this.#checkType(stmt.ret)
      ret.info = stmt.info
      
      this.#global.define_function(name, params, ret)
    }
    
    // if(stmt.type == 'cls-dec') {
    //   const name = stmt.name.name.value
    //   const generic = stmt.name.generic.map(ident => ident.value)
    //   const cls = new ClassType(name, generic)
    //   this.#global.define_class(name, cls)
    // }
  }
  
  #checkType(expr, generic) {
    if (expr.type = 'instance') {
      const name = expr.name.value
      
      if(name == 'any') return ANY
      if(name == 'void') return VOID
      if(!this.#global.has_class(name))
        if(generic.includes(name))
          return new GenricType(name)
      return new InstanceType(this.#global.get_class(name))
    }
  }
}

function error(msg, token) {
  // if(!token)
  
  return { type: 'err', msg, start: token.start, end: token.end }
}