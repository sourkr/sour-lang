import { Tokenizer } from './tokens.js';

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
      
      default: return this.#parseExpr()
    }
  }
  
  #parseExpr() {
    switch (this.#peekToken().type) {
      case 'ident': return this.#parseIdent()
      
      case 'num' :
      case 'str' :
        return this.#nextToken()
      
      case 'eof': return null
      case 'err': return this.#nextToken()
      
      case 'cmt': return this.#parseStmt(this.#nextToken())
      
      // case 'punc': return this.#mayDot(this.#parsePunc())
      
      default: return error(`unexpected token ${this.#peekToken().value}`, this.#nextToken())
    }
  }
  
  // stmt
  #parseVar() {
    let valType
    let value
    
    this.#nextToken() // skip 'var'
    
    if(!this.#isIdent()) return unexpected(this.#nextToken(), 'var', { })
    const name = this.#nextToken()
    
    if(this.#isPunc(':')) {
      this.#nextToken() // skip ':'
    
      if(!this.#isIdent()) return unexpected(this.#nextToken(), 'var', { name })
      valType = this.#nextToken()
    }
    
    if(this.#isPunc('=')) {
      this.#nextToken() // skip '='
    
      value = this.#parseExpr()
      if(is_error(value)) return unexpected(value, 'var', { name, valType })
    }
    
    if(!(valType || value)) return unexpected(this.#nextToken(), 'var', { name, valType, value })
    return { type: 'var', name, valType, value }
  }
  
  #parseConst() {
    this.#nextToken() // skip 'const'
    
    let valType
    
    if (!this.#isIdent()) return unexpected(this.#nextToken(), 'var', {})
    const name = this.#nextToken()
    
    if (this.#isPunc(':')) {
      this.#nextToken() // skip ':'
    
      if (!this.#isIdent()) return unexpected(this.#nextToken(), 'var', { name })
      valType = this.#nextToken()
    }
    
    if(!this.#isPunc('=')) return unexpected(this.#nextToken(), 'const', { name, valType })
    this.#nextToken() // skip '='
    
    const value = this.#parseExpr()
    if (is_error(value)) return unexpected(value, 'const', { name, valType })
    
    return { type: 'const', name, valType, value }
  }
  
  
  // expr
  #parseIdent() {
    const ident = this.#nextToken()
    
    switch (true) {
      case this.#isPunc('('): return this.#parseCall(ident)
      case this.#isPunc('='): return this.#parseAssign(ident)
      default: return ident
    }
  }
  
  #parsePunc() {
    switch (true) {
      case this.#isPunc('<'): return this.#parseEle()
      default: return error(`unexpected token ${stringify(token)}`, token - 1)
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
    this.#nextToken() // skip =
    
    const value = this.#parseExpr()
    
    return { type: 'assign', name, value }
  }
  
  #mayDot(left) {
    if(!this.#isPunc('.')) return left
    
    this.#nextToken() // skip .
    const right = this.#nextToken()
    return this.#mayCall(this.#mayDot({ type: 'dot', left, right }))
  }
  
  // util
  #isKeyword(name) {
    const tok = this.#peekToken()
    return tok.type == 'ident' && tok.value == name
  }
  
  #isPunc(val) {
    const tok = this.#peekToken()
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
  
  forEach(f) {
    let stmt
    
    while ((stmt = this.next()) != null) {
      f(stmt)
    }
  }
}

function stringify(obj) {
  if(!obj) return 'end of file'
  
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