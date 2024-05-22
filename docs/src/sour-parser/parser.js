import { Tokenizer } from './tokens.js';

const arithmeric = '+-*/'
const single = '<>'

export class Parser {
  #tokens
    
  constructor(input) {
    this.#tokens = new Tokenizer(input)
  }
  
  next() {
    return this.#parseStmt()
  }
  
  #parseStmt() {
    switch(true) {
      case this.#isKeyword('var'): return this.#parseVar()
      case this.#isKeyword('const'): return this.#parseConst()
      case this.#isKeyword('fun'): return this.#parseFun()
      
      case this.#isKeyword('if'): return this.#parseIf()
      case this.#isKeyword('while'): return this.#parseWhile()
      case this.#isKeyword('for'): return this.#parseFor()
      
      default: return this.#parseExpr()
    }
  }
  
  #parseExpr() {
    switch (this.#peekToken().type) {
      case 'ident': return this.#parseIdent()
      
      case 'num' :
      case 'str' :
      case 'char' :
        return this.#mayAs(this.#mayOp(this.#nextToken()))
      
      case 'eof': return null
      case 'err': return this.#nextToken()
      
      case 'cmt': return this.#parseStmt(this.#nextToken())
      
      case 'punc': return this.#parsePunc()
      
      default: return error(`unexpected token ${this.#peekToken().value}`, this.#nextToken())
    }
  }
  
  
  // stmt
  #parseVar() {
    let valType
    let value
    
    const kw = this.#nextToken()
    
    if(!this.#isIdent()) return unexpected(this.#nextToken(), 'var', { kw })
    const name = this.#nextToken()
    
    if(this.#isPunc(':')) {
      this.#nextToken() // skip ':'
    
      valType = this.#parseType()
    }
    
    if(this.#isPunc('=')) {
      this.#nextToken() // skip '='
    
      value = this.#parseExpr()
      if(is_error(value)) return unexpected(value, 'var', { kw, name, valType })
    }
    
    if(!(valType || value)) return unexpected(this.#nextToken(), 'var', { kw, name, valType, value })
    
    return { type: 'var', kw, name, valType, value }
  }
  
  #parseConst() {
    this.#nextToken() // skip 'const'
    
    let valType
    
    if (!this.#isIdent()) return unexpected(this.#nextToken(), 'var', {})
    const name = this.#nextToken()
    
    if (this.#isPunc(':')) {
      this.#nextToken() // skip ':'
    
      valType = this.#parseType()
    }
    
    if(!this.#isPunc('=')) return unexpected(this.#nextToken(), 'const', { name, valType })
    this.#nextToken() // skip '='
    
    const value = this.#parseExpr()
    if (is_error(value)) return unexpected(value, 'const', { name, valType })
    
    return { type: 'const', name, valType, value }
  }
  
  #parseFun() {
    this.#skip() // 'fun'
    
    const name = this.#nextToken()
    const params = this.#parseParams()
    this.#skip() // ':'
    const ret = this.#parseType()
    const body = this.#parseBlock()
    
    return { type: 'fun', name, body, ret }
  }
  
  #parseIf() {
    this.#skip() // 'if'
    
    if(!this.#isPunc('(')) return new unexpected(this.#nextToken(), 'if', {})
    this.#skip()
    
    const condition = this.#parseExpr()
    
    if(!this.#isPunc(')')) return new unexpected(this.#nextToken(), 'if', { condition })
    this.#skip()
    
    const body = this.#parseBody()
    
    let elseBody = []
    
    if(this.#isKeyword('else')) {
      this.#skip() // 'else'
      
      elseBody = this.#parseBody()
    }
    
    return { type: 'if', condition, body, elseBody }
  }
  
  #parseWhile() {
    this.#skip() // 'while'
    
    if (!this.#isPunc('(')) return new unexpected(this.#nextToken(), 'while', {})
    this.#skip()
    
    const condition = this.#parseExpr()
    
    if (!this.#isPunc(')')) return new unexpected(this.#nextToken(), 'while', { condition })
    this.#skip()
    
    const body = this.#parseBody()
    
    return { type: 'while', condition, body }
  }
  
  #parseFor() {
    this.#skip() // 'for'
    
    if (!this.#isPunc('(')) return new unexpected(this.#nextToken(), 'for', {})
    this.#skip()
    
    const initialisation = this.#parseStmt()
    
    if (!this.#isPunc(';')) return new unexpected(this.#nextToken(), 'for', { initialisation })
    this.#skip()
    
    const condition = this.#parseExpr()
    
    if (!this.#isPunc(';')) return new unexpected(this.#nextToken(), 'for', { initialisation, condition })
    this.#skip()
    
    const incrementation = this.#parseExpr()
    
    if (!this.#isPunc(')')) return new unexpected(this.#nextToken(), 'for', { initialisation, condition, incrementation })
    this.#skip()
    
    const body = this.#parseBody()
    
    return { type: 'for', initialisation, condition, incrementation, body }
  }
  
  #parseParams() {
    this.#skip() // '('
    
    const params = []
    
    if(this.#isPunc(')')) {
      this.#skip() // ')'
      return params
    }
    
    while (true) {
      const name = this.#nextToken()
      this.#skip() // ':'
      const type = this.#parseType()
      
      params.push({ name, type })
      
      if(this.#isPunc(')')) {
        this.#skip() // ')'
        return params
      }
      
      this.#skip() // ','
    }
  }
  
  #parseBody() {
    const body = []
    
    if(!this.#isPunc('{')) return body.push(this.#parseStmt())
    
    return this.#parseBlock()
  }
  
  #parseBlock() {
    const body = []
    
    this.#skip() // '{'
      
    while (true) {
      if(this.#isPunc('}')) {
        this.#skip() // '}'
        break
      }
      
      const stmt = this.#parseStmt()
      body.push(stmt)
      if(is_error(stmt)) return body
    }
    
    return body
  }
  
  
  // expr
  #parseIdent() {
    const ident = this.#nextToken()
    
    switch (true) {
      case this.#isPunc('('): return this.#parseCall(ident)
      case this.#isPunc('='): return this.#parseAssign(ident)
      default: return this.#mayEqOp(this.#mayDot(ident))
    }
  }
  
  #parsePunc() {
    switch (true) {
      case this.#isPunc('<'): return this.#parseEle()
      case this.#isPunc('['): return this.#parseArray()
      default: return error(`unexpected token ${stringify(this.#peekToken())}`, this.#nextToken())
    }
  }
  
  #parseEle() {
    const name = this.#parseTagStart()
    this.#parseTagEnd()
    
    return { type: 'ele', name }
  }
  
  #parseTagStart() {
    this.#nextToken() // skip '<'
    const name = this.#nextToken()
    this.#nextToken() // skip '>'
    
    return name
  }
  
  #parseTagEnd() {
    this.#nextToken() // skip '<'
    this.#nextToken() // skip '/'
    const name = this.#nextToken()
    this.#nextToken() // skip '>'
  
    return name
  }
  
  #parseCall(access) {
    const start = access.start
    const rOpen = this.#nextToken()
    
    const args = []
    
    if (this.#isPunc(')')) {
      const rClose = this.#nextToken()
      const end = rClose.end
      return { type: 'call', access, args, start, end }
    }
    
    while (true) {
      const expr = this.#parseExpr()
      if(is_error(expr)) return unexpected(expr, 'call', { access, args })
      args.push(expr)
      
      if(this.#isPunc(')')) {
        const rClose = this.#nextToken()
        const end = rClose.end
        return { type: 'call', access, args, start, end }
      }
      
      if(!this.#isPunc(',')) return unexpected(this.#nextToken(), 'call', { access, args })
      this.#nextToken() // skip ','
    }
  }
  
  #mayCall(access) {
    if(this.#isPunc('(')) return this.#parseCall(access)
    return access
  }
  
  #parseAssign(name) {
    this.#skip() // '='
    
    if(this.#isPunc('=')) {
      const operator = this.#nextToken()
      const right = this.#parseExpr()
      
      return { type: 'op', left: name, right, operator }
    }
    
    const value = this.#parseExpr()
    
    return { type: 'assign', name, value }
  }
  
  #mayDot(left) {
    if(!this.#isPunc('.')) return left
    
    this.#skip() // skip .
    
    if(!this.#isIdent()) return unexpected(this.#nextToken(), 'dot', { left })
    const right = this.#nextToken()
    
    return this.#mayCall(this.#mayDot({ type: 'dot', left, right }))
  }
  
  #parseArray() {
    this.#skip() // skip '['
    
    const values = []
    
    let sClose
    
    if(this.#isPunc(']')) sClose = this.#nextToken()
    
    while (!sClose) {
      values.push(this.#parseExpr())
      
      if(this.#isPunc(']')) {
        sClose = this.#nextToken()
        break
      }
      
      if(!this.#isPunc(',')) return unexpected(this.#nextToken(), 'array', { values, valType })
      this.#skip() // ','
    }
    
    let valType
    
    if(this.#isPunc(':')) {
      this.#skip() // ':'
      valType = this.#parseType()
    }
    
    return { type: 'array', values,valType }
  }
  
  #mayOp(left) {
    if (!this.#isPunc()) return left
    
    const operator = this.#peekToken()
    
    if (arithmeric.includes(operator.value)) {
      this.#skip()
    
      if (this.#isPunc('=')) {
        this.#skip()
        
        const right = this.#parseExpr()
        
        return { type: 'op', left, right, operator, isEquals: true }
      }
      
      const right = this.#parseExpr()
      
      return { type: 'op', left, right, operator }
    }
    
    if (single.includes(operator.value)) {
      this.#skip()
    
      if (this.#isPunc('=')) {
        this.#skip()
    
        const right = this.#parseExpr()
    
        return { type: 'op', left, right, operator, isEquals: true }
      }
    
      const right = this.#parseExpr()
    
      return { type: 'op', left, right, operator }
    }
    
    return left
  }
  
  #mayEqOp(left) {
    if(!this.#isPunc()) return left
    
    const operator = this.#peekToken()
    
    if(arithmeric.includes(operator.value)) {
      this.#skip()
      
      if(this.#isPunc('=')) {
        this.#skip()
        
        const right = this.#parseExpr()
        
        return { type: 'op', left, right, operator, isEquals: true }
      }
      
      const right = this.#parseExpr()
      
      return { type: 'op', left, right, operator }
    }
    
    if(single.includes(operator.value)) {
      this.#skip()
      
      if (this.#isPunc('=')) {
        this.#skip()
        
        const right = this.#parseExpr()
        
        return { type: 'op', left, right, operator, isEquals: true }
      }
      
      const right = this.#parseExpr()
      
      return { type: 'op', left, right, operator }
    }
    
    return left
  }
  
  #mayAs(expr) {
    if(!this.#isKeyword('as')) return expr
    
    const kw = this.#nextToken()
    const castType = this.#parseType()
    
    return { type: 'as', expr, kw, castType }
  }
  
  // type
  #parseType() {
    if(!this.#isIdent())
      return unexpected(this.#nextToken(), 'instance', {})
    const name = this.#nextToken()
    
    return this.#mayArrayType({ type: 'instance', name })
  }
  
  #mayArrayType(type) {
    if (this.#isPunc('[')) return this.#parseArrayType(type)
    return type
  }
  
  #parseArrayType(typ) {
    this.#nextToken() // skip '['
    
    if (!this.#isPunc(']')) return unexpected(this.#nextToken(), 'array', { name })
    this.#nextToken() // skip ']'
    
    return { type: 'array', typ }
  }
  
  
  // util
  #isKeyword(name) {
    const tok = this.#peekToken()
    return tok.type == 'ident' && tok.value == name
  }
  
  
  #isPunc(val) {
    const tok = this.#peekToken()
    if(!val) return tok.type == 'punc'
    return tok.type == 'punc' && tok.value == val
  }
  
  #isIdent() {
    return this.#peekToken().type == 'ident'
  }
  
  #nextToken() {
    const tok = this.#tokens.next()
    if(tok.type == 'cmt') return this.#nextToken()
    return tok
  }
  
  #peekToken() {
    const tok = this.#tokens.peek()
    if (tok.type == 'cmt') return this.#tokens.next() && this.#peekToken()
    return tok
  }
  
  #skip() {
    this.#nextToken()
  }
  
  forEach(f) {
    let stmt
    
    while ((stmt = this.next()) != null) {
      f(stmt)
    }
  }
}

function stringify(obj) {
  if(!obj) return 'end of file'
  
  if(obj.type == 'ident') return obj.value
  if(obj.type == 'punc') return obj.value
  if(obj.type == 'unknown') return obj.value
  if(obj.type == 'eof') return obj.value
  
  return JSON.stringify(obj)
}

function is_error(expr) {
  return !expr || expr.type == 'err'
}

function unexpected(token, type, data) {
  let err = token?.type == 'err'
    ? token
    : error(`unexpected token ${stringify(token)}`, token)
  
  return { ...data, type, err }
}

function error(msg, token) {
  return { type: 'err', msg, start: token?.start, end: token?.end }
}

function ret_err(err, type, data) {
  return { type, err, ...data }
}

function operator(left, right, isEquals, ...ops) {
  
}