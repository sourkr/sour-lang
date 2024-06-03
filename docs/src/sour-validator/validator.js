import { Parser } from '../sour-parser/parser.js';
import { GlobalScope, MethodScope, ClassType, InstanceType, ParamList, ParamType, ANY, VOID } from './types.js';
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
  
  #errors = []
  
  #parser
  
  constructor(input) {
    this.#parser = new Parser(input)
  }
  
  validate() {
    const body = this.#parser.parse()
      .map(stmt => this.#checkStmt(stmt))
      
    return { body, errors: this.#errors }
  }
  
  #checkStmt(stmt, scope = this.#global) {
    if(!stmt) return null
    if(stmt.err) this.#err(stmt.err)
    
    switch (stmt.type) {
      case 'var'  : return this.#checkVar(stmt, scope)
      case 'const': return this.#checkConst(stmt, scope)
      case 'fun'  : return this.#checkFun(stmt)
      case 'class': return this.#checkClass(stmt, scope)
      case 'if'   : return this.#checkIf(stmt, scope)
      case 'while': return this.#checkWhile(stmt)
      case 'for'  : return this.#checkFor(stmt)
      case 'ret'  : return this.#checkRet(stmt, scope)
      case 'cmt'  : return stmt
      
      default: return this.#checkExpr(stmt, scope)
    }
    
    return stmt
  }
  
  #checkExpr(expr, scope) {
    if(expr?.err) this.#err(expr.err)
    
    switch (expr?.type) {
      case 'call'  : return this.#checkCall(expr, scope)
      case 'str'   : return this.#checkStr(expr)
      case 'num'   : return this.#checkNum(expr)
      case 'ident' : return this.#checkIdent(expr, scope)
      case 'char'  : return this.#checkChar(expr)
      case 'assign': return this.#checkAssign(expr, scope)
      case 'array' : return this.#checkArray(expr)
      case 'dot'   : return this.#checkDot(expr, scope)
      case 'op'    : return this.#checkOp(expr, scope)
      case 'as'    : return this.#checkAs(expr)
      case 'neg'   : return this.#checkNeg(expr)
      case 'new'   : return this.#checkNew(expr, scope)
      
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
  
  #checkConst(v, scope) {
    if(v.err) this.#err(v.err)
    
    let typ
    
    const name = v.name?.value
    if(scope.has(name)) this.#error(`cannot redeclare symbol ${name}`, v.name)
    
    if(v.valType) {
      typ = this.#checkType(v.valType)
      if (typ.type == 'err') this.#err(type)
    }
    
    const val = this.#checkExpr(v.value, scope)
    
    if(typ) {
      if(!val.typ.isAssignableTo(typ))
        this.#error(`value of type ${val.typ} is not assignable to variable of type ${typ}`, v.value)
    } else typ = val.typ
    
    scope.def_const(name, typ)
    
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
    const cls_stmt = stmt
    
    if(this.#global.has(name)) this.#error(`cannot redeclare symbol '${name}'`, stmt.name)
    
    const cls = new ClassType(name, [])
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
        
        let typ
        let val
        
        if (stmt.valType) {
          type = this.#checkType(stmt.valType)
        }
        
        if (stmt.value) {
          val = this.#checkExpr(stmt.value, scope)
          typ = typ || val.typ
        }
        
        
        cls.def_field(name, typ)
        
        return { ...stmt, val, typ }
      }
      
      if(stmt.type == 'const') {
        const name = stmt.name?.value
        
        let typ
        let val
        
        if (stmt.valType) {
          typ = this.#checkType(stmt.valType)
        }
        
        if (stmt.value) {
          val = this.#checkExpr(stmt.value, scope)
          typ = typ ?? val.typ
        }
        
        if (typ) {
          typ.isInit = !!val
          typ.isConst = true
        }  
        
        cls.def_field(name, typ)
        
        return { ...stmt, val, typ }
      }
      
      if(stmt.type == 'fun') {
        const name = stmt.name?.value
        const paramNames = []
        const mScope = new MethodScope(this.#global, new InstanceType(cls))
        
        const params = stmt.params?.map?.(param => {
          if (param.err) this.#err(param.err)
          if (param.type == 'err') this.#err(param)
          
          const typ = this.#checkType(param.paramType)
          mScope.def_const(param.name?.value, typ)
          
          return { ...param, typ }
        })
        
        const paramList = new ParamList(params?.map(p => new ParamType(p.name?.value, p.typ)) || [])
        const typ = this.#checkType(stmt.ret, true)
        
        let body
        
        if (name == 'constructor') {
          if (!is_void(typ)) this.#error(`return type of constructor must be 'void'`, stmt.ret)
          
          body = stmt.body?.map?.(stmt => {
            if(stmt.type == 'assign')
              return this.#checkAssign(stmt, mScope, true)
            
            return this.#checkStmt(stmt, mScope)
          })
          
        } else body = this.#checkBody(stmt.body, mScope)
        
        let returns = false
        
        body?.forEach?.(stmt => {
          if (stmt?.type == 'ret') {
            if (!stmt.val.typ.isAssignableTo(typ))
              this.#error(`'${stmt.val.typ}'' is not assignable to '${typ}'`, stmt.kw)
            returns = true
          }
        })
        
        if (!returns && !is_void(typ)) this.#error(`missing return statment`, stmt.name)
        
        cls.def_meth(name, paramList, typ)
        
        return { ...stmt, body, typ, param: paramList.toString(true), paramList }
      }
      
      return this.#unexpected_symbol(stmt)
    })
    
    cls.fields.forEach((type, name) => {
      if(type.isConst && !type.isInit) {
        // console.log(stmt.body)
        const cst = cls_stmt.body.find(stmt => stmt.name.value == name).name
        this.#error(`constant field '${name}' is not initialised in constructor`, cst)
      }
    })
    
    return { ...stmt, body }
  }
  
  #checkIf(s, scope) {
    const condition = this.#checkExpr(s.condition, scope)
    
    if(!is_bool(condition.typ)) this.#error(`condition must be boolean`, s.kw)
    
    const body = this.#checkBody(s.body, scope)
    const elseBody = this.#checkBody(s.elseBody, scope)
    
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
  
  #checkRet(ret, scope) {
    const val = this.#checkExpr(ret.value, scope)
    
    return { ...ret, val }
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
      
      const args = call.args.map(arg => this.#checkExpr(arg, scope))
      const typeArgs = args.map(arg => arg.typ)
      
      if (!left.typ.has_meth(name, typeArgs)) {
        const funs = left.typ.methods.get(name)
        const errors = []
      
        errors.push(`cannot find suitable method for ${name}(${typeArgs.join(',')}) in ${left.typ}`)
        for (let params of funs.keys()) errors.push(`   ${name}${params} is not applicable`)
        return this.#error(errors.join('\n\n') + '\n\n', call.access, call)
      }
      
      const param = left.typ.get_meth_params(name, typeArgs)
      const typ = left.typ.get_meth(name, typeArgs)
      const access = { ...call.access, left }
      
      return { ...call, access, param, args, typ }
    }
    
    const name = call.access.value
    const args = call.args.map(arg => this.#checkExpr(arg, scope))
    const typeArgs = args.map(arg => arg.typ)
    
    if (scope.has_meth?.(name)) {
      if (!scope.has_meth(name, typeArgs)) {
        const meths = scope.get_meths(name)
        const errors = []
        
        errors.push(`cannot find suitable method for ${name}(${typeArgs.join(',')})`)
        for(let params of meths.keys()) errors.push(`   ${name}${params} is not applicable`)
        return this.#error(errors.join('\n\n') + '\n\n', call.access.right, call)
      }
      
      const param = scope.get_meth_params(name, typeArgs)
      const typ = scope.get_meth(name, typeArgs)
      
      return { ...call, param, args, typ }
    }
    
    if(!scope.has_fun(name))
      return this.#error(`cannot not find function ${name}`, call.access, call)
    
    if(!scope.has_fun(name, typeArgs)) {
      const funs = scroll.get_funs(name)
      const errors = []
      
      errors.push(`cannot find suitable function for ${name}(${typeArgs.join(',')})`)
      for(let params of funs.keys()) errors.push(`   ${name}${params} is not applicable`)
      return this.#error(errors.join('\n\n') + '\n\n', call.access, call)
    }
    
    const param = scope.get_fun_params(name, typeArgs)
    const typ = scope.get_fun(name, typeArgs)
    
    return { ...call, param, args, typ }
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
    
    if (scope?.has_var?.(name)) {
      const typ = scope.get_var(name)
      typ.usage++
      return { ...ident, typ, org: 'var' }
    }
    
    if (scope?.has_const?.(name)) {
      return { ...ident, typ: scope.get_const(name), org: 'const' }
    }
    
    if (scope?.has_field?.(name)) {
      return { ...ident, typ: scope.get_field(name), org: 'field' }
    }
    
    return this.#error(`cannot find symbol '${name}'`, ident, { ...ident, typ: ANY })
  }
  
  #checkChar(char) {
    return {
      ...char,
      val: char.value.slice(1, -1),
      typ: new InstanceType(this.#global.get_class('char'))
    }
  }
  
  #checkAssign(assign, scope, isInConstructor) {
    if(assign.access.type == 'dot') {
      const left = this.#checkExpr(assign.access.left, scope)
      const val = this.#checkExpr(assign.value, scope)
      const name = assign.access.right.value
      
      if (!left.typ.has_field(name)) return this.#error(`cannot find field '${name}' in '${typ.class.name}'`, assign.access.right, { ...assign, left })
      const typ = left.typ.get_field(name)
      
      if (!val.typ.isAssignableTo(typ)) this.#error(`'${val.typ}' is not assignable to '${typ}'`, assign.access.right)
      
      if (typ.isConst) {
        if (isInConstructor) {
          if (typ.isInit) this.#error(`constant field '${name}' is already assigned in '${scope.self.class.name}'`, assign.access)
          else typ.isInit = true
        } else this.#error(`cannot assign to constant field '${name}' in '${scope.self.class.name}'`, assign.access)
      }
      
      return { ...assign, left, val, typ }
    }
    
    if (is_error(assign.value)) return { ...assign, typ: ANY }
    
    const name = assign.access.value
    
    if (scope.has_const?.(name)) return this.#error(`cannot assign to const variable '${name}'`, assign.access, assign)
    
    let typ
    
    if (scope.has_var?.(name)) typ = scope.get_var(name)
    if (scope.has_field?.(name)) typ = scope.get_field(name)
    if (scope.has_const?.(name)) typ = scope.get_const(name)
    
    if (!typ) return this.#error(`cannot find variable '${name}'`, assign.access, assign)
    
    
    const val = this.#checkExpr(assign.value)
    if(!val.typ.isAssignableTo(typ)) this.#error(`'${val.typ}' is not assignable to '${typ}'`, assign.value)
    
    if(typ.isConst) {
      if (isInConstructor) {
        if (typ.isInit) this.#error(`constant field '${name}' is already assigned in '${scope.self.class.name}'`, assign.access)
        else typ.isInit = true
      } else this.#error(`cannot assign to constant field '${name}' in '${scope.self.class.name}'`, assign.access)
    }
    
    return { ...assign, typ, val }
  }
  
  #checkArray(arr) {
    if(arr.err) this.#err(arr.err)
    
    
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
    // console.log(left, name)
    if(left.typ?.kind == 'special' && left.typ.type == 'any') {
      return { ...dot, left, typ: ANY} 
    }
    
    if(!left.typ?.has_field(name)) return this.#error(`connot find field ${name} in ${left.typ}`, dot.right, dot)
    
    const typ = left.typ.get_field(name) || ANY
    
    return { ...dot, left, typ }
  }
  
  #checkOp(op, scope) {
    const left = this.#checkExpr(op.left, scope)
    const right = this.#checkExpr(op.right, scope)
    const operator = op.operator.value
    
    // if(is_error(right)) return { ...op, typ: ANY }
    
    const name = op_names.get(operator)
    // console.log(name)
    if(!left.typ.has_meth?.(name, [right.typ]))
      return this.#error(`cannot find operator (${left.typ} ${operator}${op.isEquals?'=':''} ${right.typ})`, op.operator, { ...op, left, right })
      
    const params = left.typ.get_meth_params(name, [right.typ])
    const typ = left.typ.get_meth(name, [right.typ])
    
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
  
  #checkNew(n, scope) {
    const name = n.name?.value
    
    if(!this.#global.has_class(name))
      return this.#error(`cannot find class '${name}'`, n.name, { ...n, typ: ANY })
    
    const typ = new InstanceType(this.#global.get_class(name))
    const args = n.args.map(e => this.#checkExpr(e, scope))
    const typeArgs = args.map(a => a.typ)
    
    if (!typ.has_meth('constructor')) return this.#error(`cannot find constructor in '${name}'`, { ...n, typ: ANY })
    if (!typ.has_meth('constructor', typeArgs)) {
      const meths = typ.get_meths('constructor')
      const errors = []
      
      errors.push(`cannot find suitable constructor for ${name}(${typeArgs})`)
      for (let params of meths.keys()) errors.push(`   ${name}${params} is not applicable`)
      return this.#error(errors.join('\n\n') + '\n\n', n.name, { ...n, typ: ANY })
    }
    
    const param = typ.get_meth_params('constructor', typeArgs)
    
    return { ...n, typ, param, args }
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
    this.#errors.push(err)
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
    
    // if()
    
    this.#err({
      type: 'err',
      msg: `unexpected symbol ${name}`,
      start, end
    })
    
    return symbol
  }
}

function is_error(symbol) {
  return symbol.type == 'err'
}

function error(msg, token) {
  return { type: 'err', msg, start: token?.start, end: token?.end }
}

function is_any(type) {
  return type.kind == 'special' && type.type == 'any'
}

function is_void(type) {
  return type.kind == 'special' && type.type == 'void'
}

function is_bool(type) {
  return type?.class?.name == 'bool'
}