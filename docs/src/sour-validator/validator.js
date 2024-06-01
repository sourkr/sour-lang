import { Parser } from '../sour-parser/parser.js';
import { GlobalScope, MethodScope, ClassType, InstanceType, ParamList, ANY, VOID } from './types.js';
import { BUILTINS } from './builtin.js';

const reserved = [ 'true', 'false', 'null', 'void' ]
const op_names = new Map([
  ['+', 'plus'],
  ['=', 'equals'],
  ['<', 'less_than'],
])
const single = '<>'
const nums = ['byte', 'int']

export class Validator {
  #global = new GlobalScope(BUILTINS)
  
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
  
  #checkStmt(stmt, scope = this.#global) {
    if(!stmt) return null
    if(stmt.err) this.#err(stmt.err)
    
    switch (stmt.type) {
      case 'var': return this.#checkVar(stmt, scope)
      case 'const': return this.#checkConst(stmt)
      case 'fun': return this.#checkFun(stmt)
      case 'class': return this.#checkClass(stmt, scope)
      case 'if': return this.#checkIf(stmt)
      case 'while': return this.#checkWhile(stmt)
      case 'for': return this.#checkFor(stmt)
      
      default: return this.#checkExpr(stmt, scope)
    }
    
    return stmt
  }
  
  #checkExpr(expr, scope) {
    if(expr?.err) this.#err(expr.err)
    
    switch (expr?.type) {
      case 'call': return this.#checkCall(expr, scope)
      case 'str': return this.#checkStr(expr)
      case 'num': return this.#checkNum(expr)
      case 'ident': return this.#checkIdent(expr, scope)
      case 'char': return this.#checkChar(expr)
      case 'assign': return this.#checkAssign(expr)
      case 'array': return this.#checkArray(expr)
      case 'dot': return this.#checkDot(expr, scope)
      case 'op': return this.#checkOp(expr)
      case 'as': return this.#checkAs(expr)
      case 'neg': return this.#checkNeg(expr)
      case 'new': return this.#checkNew(expr)
      
      default: return this.#error(`unexpected symbol`, expr, {...expr, typ: ANY})
    }
  }
  
  
  // stmt
  #checkVar(v, scope) {
    let val
    let typ
    
    const name = v.name?.value
    if(this.#global.has(name)) this.#error(`cannot redeclare symbol '${name}'`, v.name)
    
    if(v.valType) {
      typ = this.#checkType(v.valType)
      if (typ.type == 'err') this.#err(typ)
    }
    
    if(v.value) {
      val = this.#checkExpr(v.value, scope)
      // console.log(val.typ.toString())
      
      if(typ) {
        if(!val.typ.isAssignableTo(typ))
          this.#error(`value of type '${val.typ}'' is not assignable to variable of type '${typ}'`, v.value)
      } else typ = val.typ
    }
    
    if(typ) typ.usage = 0
    
    this.#global.def_var(name, typ)
    
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
  
  #checkFun(fun) {
    const params = new ParamList([])
    const name = fun.name.value
    
    if(this.#global.has_same_fun(name, params))
      this.#error(`cannot redeclare function ${name}${params}`, name)
    
    const body = this.#checkBody(fun.body)
    
    this.#global.define_function(name, params, ANY)
    
    return { ...fun, body, params: params.toString() }
  }
  
  #checkClass(stmt, scope) {
    const name = stmt.name?.value
    
    if(this.#global.has(name)) this.#error(`cannot redeclare symbol '${name}'`, stmt.name)
    
    const cls = new ClassType(name, [])
    const mScope = new MethodScope(this.#global, cls)
    this.#global.def_class(name, cls)
    
    const body = stmt.body?.map(stmt => {
      if(!stmt) return
      if(stmt.err) this.#err(stmt.err)
      
      if(stmt.type == 'err') {
        this.#err(stmt)
        return
      }
      
      if(stmt.type == 'var') {
        const name = stmt.name?.value
        const val = this.#checkExpr(stmt.value, scope)
        
        cls.def_field(name, val.typ)
        
        return { ...stmt, val }
      }
      
      if(stmt.type == 'fun') {
        const name = stmt.name?.value
        
        const params = new ParamList([])
        
        if(name == 'constructor') {
          
        }
        
        const typ = this.#checkType(stmt.ret, true)
        
        const body = this.#checkBody(stmt.body, mScope)
        
        cls.def_meth(name, params, typ)
        
        return { ...stmt, body, typ, params: params.toString(true) }
      }
      
      return this.#unexpected_symbol(stmt)
    })
    
    return { ...stmt, body }
  }
  
  #checkIf(s) {
    const condition = this.#checkExpr(s.condition)
    if(condition.typ.class.name != 'bool') this.#error(`condition must be boolean`, s.condition)
    
    const body = this.#checkBody(s.body)
    const elseBody = this.#checkBody(s.elseBody)
    
    return { ...s, condition, body, elseBody }
  }
  
  #checkWhile(s) {
    const condition = this.#checkExpr(s.condition)
    if (condition.typ.class.name != 'bool') this.#error(`condition must be boolean`, s.condition)
  
    const body = this.#checkBody(s.body)
  
    return { ...s, condition, body }
  }
  
  #checkFor(s) {
    const initialisation = this.#checkStmt(s.initialisation)
    const condition = this.#checkExpr(s.condition)
    if(condition.typ.class.name != 'bool') this.#error(`condition must be boolean`, s.condition)
    
    const incrementation = this.#checkExpr(s.incrementation)
    const body = this.#checkBody(s.body)
    
    return { ...s, initialisation, condition, incrementation, body }
  }
  
  #checkBody(body, scope) {
    return body?.map?.(stmt => this.#checkStmt(stmt, scope))
  }
  
  
  // expr
  #checkCall(call, scope) {
    if(call.err) this.#err(call.err)
    
    if (call.access.type == 'dot') {
      const left = this.#checkExpr(call.access.left, scope)
      const name = call.access.right.value
      
      if(is_any(left.typ)) {
        call.args.forEach(arg => this.#checkExpr(arg, scope))
        return { ...call, access: { ...call.access, left} }
      }
      
      if (!left.typ.has_meth(name))
        return this.#error(`cannot not find method ${name} in ${left.typ}`, call.access, call)
      
      const args = call.args.map(arg => this.#checkExpr(arg))
      const typeArgs = args.map(arg => arg.typ)
      
      if (!left.typ.has_meth(name, typeArgs)) {
        const funs = left.typ.methods.get(name)
        const errors = []
      
        errors.push(`cannot find suitable method for ${name}(${typeArgs.join(',')}) in ${left.typ}`)
        for (let params of funs.keys()) errors.push(`   ${name}${params} is not applicable`)
        return this.#error(errors.join('\n\n') + '\n\n', call.access, call)
      }
      
      // console.log(Object.fromEntries(left.typ.methods.get('at')))
      
      const params = left.typ.get_meth_params(name, typeArgs)
      const typ = left.typ.get_meth(name, typeArgs)
      const access = { ...call.access, left }
      
      return { ...call, access, params, args, typ }
    }
    
    const name = call.access.value
    
    if(!this.#global.has_fun(name))
      return this.#error(`cannot not find function ${name}`, call.access, call)
    
    const args = call.args.map(arg => this.#checkExpr(arg, scope))
    const typeArgs = args.map(arg => arg.typ)
    
    if(!this.#global.has_fun(name, typeArgs)) {
      const funs = this.#global.get_functions(name)
      const errors = []
      
      errors.push(`cannot find suitable function for ${name}(${typeArgs.join(',')})`)
      for(let params of funs.keys()) errors.push(`   ${name}${params} is not applicable`)
      return this.#error(errors.join('\n\n') + '\n\n', call.access, call)
    }
    
    const params = this.#global.get_fun_params(name, typeArgs)
    const typ = this.#global.get_fun(name, typeArgs)
    
    return { ...call, params, args, typ }
  }
  
  #checkStr(str) {
    if (str.err) this.#err(str.err)
    
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
  
  #checkIdent(ident, scope) {
    const name = ident.value
    
    if(name == 'true' || name == 'false') {
      return { ...ident, typ: new InstanceType(this.#global.get_class('bool')) }
    }
    
    if (scope.has_var(name)) {
      const typ = scope.get_var(name)
      typ.usage++
      return { ...ident, typ, org: 'var' }
    }
    
    if (scope?.has_const?.(name)) {
      return { ...ident, typ: scope.get_constant(name), org: 'const' }
    }
    
    if (scope?.has_field?.(name)) {
      return { ...ident, typ: scope.get_field(name), org: 'field' }
    }
    
    this.#error(`cannot find symbol '${name}'`, ident)
    
    return { ...ident, typ: ANY }
  }
  
  #checkChar(char) {
    return {
      ...char,
      val: char.value.slice(1, -1),
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
  
  #checkArray(arr) {
    if(arr.err) this.#err(arr.err)
    
    // console.log(arr.values)
    
    const values = arr.values.map(this.#checkExpr.bind(this))
    
    let type = ANY
    
    if (arr.valType) {
      type = this.#checkType(arr.valType)
      
      values.forEach(val => {
        if (!val.typ.isAssignableTo(type)) this.#error(`${val.type} is not assignable to ${type}`, val)
      })
    } else {
      if(arr.values.length)
        type = values.map(val => val.typ)
          .reduce((pre, cur) => {
            if(!pre) return cur
            if(!cur.isAssignableTo(pre)) return this.#error(`${cur} is not assignable to ${pre}`, ANY)
            return pre
          })
    }
    
    const typ = new InstanceType(this.#global.get_class('array'), type)
    
    return { ...arr, values, typ }
  }
  
  #checkDot(dot, scope) {
    const left = this.#checkExpr(dot.left, scope)
    const name = dot.right?.value
    
    
    if(left.typ.kind == 'special' && left.typ.type == 'any') {
      return { ...dot, left, typ: ANY} 
    }
    
    if(!left.typ.has_field(name)) this.#error(`connot find field ${name} in ${left.typ}`, dot.right)
    
    const typ = left.typ.get_field(name) || ANY
    
    return { ...dot, left, typ }
  }
  
  #checkOp(op) {
    const left = this.#checkExpr(op.left)
    const right = this.#checkExpr(op.right)
    const operator = op.operator.value
    
    // if(!op_names.has(operator)) return this.#error(`'${operator}' is not an operator.`, op.operator, { ...op, typ: ANY })
    
    const name = op_names.get(operator)
    
    if(!left.typ.has_method(name, [right.typ]))
      return this.#error(`cannot find operator (${left.typ} ${operator}${op.isEquals?'=':''} ${right.typ})`, operator, { ...op, left, right })
      
    const params = left.typ.get_method_params(name, [right.typ])
    const typ = left.typ.get_method(name, [right.typ])
    
    let eqParams
    
    if(op.isEquals) {
      if(!single.includes(operator)) {
        if(!typ.isAssignableTo(left.typ))
          this.#error(`${typ} is not assignable to ${left.typ}`, left)
      } else {
        if (!left.typ.has_method('equals', [right.typ]))
          this.#error(`cannot find operator (${left.typ} ${operator}= ${right.typ})`, operator)
        else eqParams = left.typ.get_method_params('equals', [right.typ])
      }
    }
    
    return { ...op, left, right, typ, params, name, eqParams }
  }
  
  #checkAs(as) {
    const expr = this.#checkExpr(as.expr)
    const typ = this.#checkType(as.castType)
    
    if(!this.#cast(expr.typ, typ)) {
      this.#error(`cannot cast '${expr.typ}' to '${typ}`, as.kw, { ...as, expr, typ: ANY })
    }
    
    return { ...as, expr, typ }
  }
  
  #checkNeg(neg) {
    const val = this.#checkExpr(neg.value)
    
    if(!val.typ?.has_method?.('negative', []))
      return this.#error(`cannot find operator (-${val.typ})`, neg.sign, { ...neg, val})
    
    const typ = val.typ.get_method('negative', []) 
    
    return { ...neg, val, typ }
  }
  
  // #checkOpEquals() {}
  
  #checkNew(n) {
    const name = n.name?.value
    
    if(!this.#global.has_class(name))
      return this.#error(`cannot find class '${name}'`, n.name, { n, typ: ANY })
    
    const typ = new InstanceType(this.#global.get_class(name))
    
    return { ...n, typ }
  }
  
  #checkType(expr, allow_void) {
    if(!expr) return ANY
    if(expr.err) this.#err(expr.err)
    
    if(expr.type == 'instance') {
      const name = expr.name?.value
      if(!name) return ANY
      
      if(name == 'void')
        if(!allow_void) return this.#error('type void is not allowed here', expr.name, ANY)
        else return VOID
      
      if(!this.#global.has_class(name)) return this.#error(`${name} is not a type`, expr.name, ANY)
      return new InstanceType(this.#global.get_class(name))
    }
    
    if(expr.type == 'array') {
      return new InstanceType(this.#global.get_class('array'), this.#checkType(expr.typ))
    }
    
    // if(expr.type == 'special')
  }
  
  
  #cast(from, to) {
    if(nums.includes(from.class?.name) && nums.includes(to.class?.name)) {
      return true
    }
    
    return false
  }
  
  
  // error
  #err(err) {
    this.#ast.errors.push(err)
  }
  
  #error(msg, token, ret) {
    this.#err(error(msg, token))
    // return { ...ret, typ: ANY }
    return ret
  }
  
  #unexpected_symbol(symbol) {
    let name
    let start
    let end
    
    if(symbol.type == 'ident') {
      name = 'idnetifier',
      start = symbol.start
      end = symbol.end
    }
    
    this.#err({
      type: 'err',
      msg: `unexpected symbol ${name}`,
      start, end
    })
    
    return symbol
  }
}

// function is_error(symbol) {
  // return symbol.type == 'err'
// }

function error(msg, token) {
  return { type: 'err', msg, start: token?.start, end: token?.end }
}

function is_any(type) {
  return type.kind == 'special' && type.type == 'any'
}