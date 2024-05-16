import { DefinationParser } from '../sour-parser/def-parser.js';
import { BuiltinScope, ParamType, ParamList, ClassType, InstanceType, ANY, VOID } from './types.js';

export class DefinationValidator {
  #global = new BuiltinScope()
  #parser
  
  constructor(input) {
    this.#parser = new DefinationParser(input)
  }
  
  validate() {
    this.#parser.forEach(stmt => this.#checkStmt(stmt))
    return this.#global
  }
  
  next() {
    return this.#checkStmt(this.#parser.next())
  }
  
  #checkStmt(stmt) {
    if(stmt.type == 'fun-dec') {
      const name = stmt.name.value
      
      const params = new ParamList(stmt.params.map(param => {
        const type = new ParamType(param.name.value, this.#checkType(param.type))
        type.isOptional = param.isOptional
        type.isSpreaded = param.isSpreaded
        return type
      }))
      
      const ret = this.#checkType(stmt.ret)
      
      this.#global.define_function(name, params, ret)
    }
    
    if(stmt.type == 'cls-dec') {
      const name = stmt.name.value
      
      this.#global.define_class(name, new ClassType(name))
    }
  }
  
  #checkType(expr) {
    if(expr.type = 'ident') {
      if(expr.value == 'any') return ANY
      if(expr.value == 'void') return VOID
      return new InstanceType(this.#global.get_class(expr.value))
    }
  }
}

function error(msg, token) {
  // if(!token)
  
  return { type: 'err', msg, start: token.start, end: token.end }
}