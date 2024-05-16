import { Parser } from '../sour-parser/parser.js';
import { ClassType, InstanceType, ANY } from './types.js';
import { BUILTINS } from './builtin.js';

const reserved = [ 'true', 'false', 'null', 'void' ]

export class Validator {
  #global = BUILTINS
  
  #ast = {
    errors: [],
    body: []
  }
  
  #parser
  
  constructor(input) {
    this.#parser = new Parser(input)
  }
  
  validate() {
    this.#parser.forEach(stmt => this.#ast.body.push(this.#checkStmt(stmt)))
    
    return this.#ast
  }
  
  next() {
    return this.#checkStmt(this.#parser.next())
  }
  
  #checkStmt(stmt) {
    if(!stmt) return null
    // console.log(stmt)
    switch (stmt.type) {
      case 'var': return this.#checkVar(stmt)
      case 'const': return this.#checkConst(stmt)
      default: return this.#checkExpr(stmt)
    }
    
    return stmt
  }
  
  #checkExpr(expr) {
    // console.log(expr)
    switch (expr.type) {
      case 'call': return this.#checkCall(expr)
      case 'str': return this.#checkStr(expr)
      case 'num': return this.#checkNum(expr)
      case 'ident': return this.#checkIdent(expr)
      case 'char': return this.#checkChar(expr)
      case 'assign': return this.#checkAssign(expr)
      
      default: this.#error(`unexpected symbol`, expr)
    }
  }
  
  
  // stmt
  #checkVar(v) {
    if(v.err) this.#err(v.err)
    
    let val
    let typ
    
    const name = v.name?.value
    if(this.#global.has(name)) this.#error(`cannot redeclare symbol ${name}`, v.name)
    
    if(v.valType) {
      typ = this.#checkType(v.valType)
      if (typ.type == 'err') this.#err(type)
    }
    
    if(v.value) {
      val = this.#checkExpr(v.value)
      
      if(typ) {
        if(!val.typ.isAssignableTo(typ))
          this.#error(`value of type ${val.typ} is not assignable to variable of type ${typ}`, v.value)
      } else typ = val.typ
    }
    
    this.#global.define_variable(name, typ)
    
    return { ...v, typ, val }
  }
  
  #checkConst(v) {
    if(v.err) this.#err(v.err)
    
    let typ
    
    const name = v.name?.value
    if(this.#global.has(name)) this.#error(`cannot redeclare symbol ${name}`, v.name)
    
    if(v.valType) {
      typ = this.#checkType(v.valType)
      if (typ.type == 'err') this.#err(type)
    }
    
    const val = this.#checkExpr(v.value)
    
    if(typ) {
      if(!val.typ.isAssignableTo(typ))
        this.#error(`value of type ${val.typ} is not assignable to variable of type ${typ}`, v.value)
    } else typ = val.typ
    
    this.#global.define_constant(name, typ)
    
    return { ...v, typ, val }
  }
  
  
  
  // expr
  #checkCall(call) {
    // console.log(call)
    if(call.err) this.#err(call.err)
    
    const name = call.access.value
    
    if(!this.#global.has_function(name))
      return this.#error(`cannot not find function ${name}`, call.access, call)
    
    const args = call.args.map(arg => this.#checkExpr(arg))
    const typeArgs = args.map(arg => arg.typ)
    // console.log(typeArgs)
    if(!this.#global.has_function(name, typeArgs)) {
      const funs = this.#global.get_functions(name)
      const errors = []
      
      errors.push(`cannot find suitable function for ${name}(${typeArgs.join(',')})`)
      for(let params of funs.keys()) errors.push(`   ${name}${params} is not applicable`)
      return this.#error(errors.join('\n\n') + '\n\n', call.access, call)
    }
    
    const index = this.#global.get_function_index(name, typeArgs)
    const typ = this.#global.get_function(name, typeArgs)
    
    return { ...call, index, args, typ }
  }
  
  #checkStr(str) {
    return {
      ...str,
      val: str.value.slice(1, -1),
      typ: new InstanceType(this.#global.get_class('str'))
    }
  }
  
  #checkNum(num) {
    if(num.value.includes('.')) return {
      ...num,
      type: 'float',
      val: parseFloat(num.value),
      typ: new InstanceType(this.#global.get_class('float'))
    }
    
    return {
      ...num,
      type: 'int',
      val: parseInt(num.value),
      typ: new InstanceType(this.#global.get_class('int'))
    }
  }
  
  #checkIdent(ident) {
    const name = ident.value
    
    if(name == 'true' || name == 'false') {
      return { ...ident, typ: new InstanceType(this.#global.get_class('bool')) }
    }
    
    if(this.#global.has_variable(name)) {
      return { ...ident, typ: this.#global.get_variable(name) }
    }
    
    if (this.#global.has_constant(name)) {
      return { ...ident, typ: this.#global.get_constant(name) }
    }
    
    this.#error(`cannot find symbol ${name}`, ident)
    
    return { ...ident, typ: ANY }
  }
  
  #checkChar(char) {
    return {
      ...char,
      val: str.value.slice(1, -1),
      typ: new InstanceType(this.#global.get_class('char'))
    }
  }
  
  #checkAssign(assign) {
    const name = assign.name.value
    
    if (this.#global.has_constant(name)) return this.#error(`cannot assign value of const`, assign.name, assign)
    if (!this.#global.has_variable(name)) return this.#error(`cannot find variable ${name}`, assign.name, assign)
    
    const typ = this.#global.get_variable(name)
    const val = this.#checkExpr(assign.value)
    
    if(!val.typ.isAssignableTo(typ)) this.#error(`value of type ${val.typ} is not assignable to variable of type ${typ}`, assign.value)
    
    return { ...assign, typ, val }
  }
  
  
  #checkType(expr) {
    if(!expr) return ANY
    
    if(expr.type == 'ident') {
      const name = expr.value
      if(name == 'void') return error('type void is not allowed here', expr)
      if(!this.#global.has_class(name)) return error(`${name} is not a type`, expr)
      return new InstanceType(this.#global.get_class(name))
    }
  }
  
  
  #err(err) {
    this.#ast.errors.push(err)
  }
  
  #error(msg, token, ret) {
    this.#err(error(msg, token))
    return { ...ret, typ: ANY }
  }
}

// function is_error(symbol) {
  // return symbol.type == 'err'
// }

function error(msg, token) {
  return { type: 'err', msg, start: token.start, end: token.end }
}