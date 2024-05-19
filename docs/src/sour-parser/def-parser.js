import { Tokenizer } from './tokens.js';

export class DefinationParser {
  #tokens
    
  constructor(input) {
    this.#tokens = new Tokenizer(input)
  }
  
  next() {
    return this.#parseStmt()
  }
  
  #parseStmt() {
    switch(true) {
      case this.#isKeyword('const'): return this.#parseConst()
      case this.#isKeyword('var'): return this.#parseVar()
      case this.#isKeyword('fun'): return this.#parseFun()
      case this.#isKeyword('class'): return this.#parseClass()
      case this.#isKeyword('static'): return { type: 'static', stmt: this.#parseStmt()}
      // case this.#isKeyword('export'): return this.#parseExport()
      // case this.#isKeyword('import'): return this.#parseImport()
      
      // default: return this.#parseExpr()
    }
  }
  
  #parseExpr() {
    switch (this.#peekToken().type) {
      case 'ident': return this.#mayDot(this.#parseIdent())
      
      case 'num' :
      case 'str' :
        return this.#nextToken()
      
      case 'eof': return null
      case 'err': return this.#nextToken()
      
      case 'cmt': return this.#parseStmt(this.#nextToken())
      
      case 'punc': return this.#mayDot(this.#parsePunc())
      
      default: return error(`unexpected token ${this.#peekToken().value}`, this.#nextToken())
    }
  }
  
  // stmt
  #parseVar() {
    this.#skip() // 'var'
    const name = this.#nextToken()
    this.#skip() // ':'
    const value = this.#parseType()
    
    return { type: 'var', name, value }
  }
  
  #parseConst() {
    this.#skip() // 'const'
    const name = this.#nextToken()
    this.#skip() // ':'
    const value = this.#parseType()
    
    return { type: 'const', name, value }
  }
  
  
  #parseFun() {
    this.#nextToken()
    const name = this.#nextToken()
    this.#nextToken()
    
    const params = []
    
    let rClose
    
    if(this.#isPunc(')')) rClose = this.#nextToken()
    
    while (!rClose) {
      params.push(this.#parseParam())
      
      if(this.#isPunc(')')) {
        rClose = this.#nextToken()
        break
      }
      
      const coma = this.#nextToken()
    }
    
    this.#nextToken() // skip ':'
    
    const ret = this.#parseType()
    
    return { type: 'fun', name, params, ret }
  }
  
  #parseClass() {
    const keyword = this.#nextToken()
    const name = this.#parseName()
    
    // var extend
    
    // if(this.#isKeyword('extends')) {
    //   this.#nextToken()
    //   extend = this.#nextToken()
    // }
    
    const body = this.#parseBody()
    
    return { type: 'class', name, body }
  }
  
  #parseReturn() {
    this.#nextToken() // skip 'return'
    const value = this.#parseExpr()
    return { type: 'return', value }
  }
  
  #parseParam() {
    let isOptional = false
    let isSpreaded = false
    
    if(this.#isPunc('.')) {
      isSpreaded = true
      
      this.#nextToken()
      this.#nextToken()
      this.#nextToken()
    }
    
    const name = this.#nextToken()
    
    if(this.#isPunc('?')) {
      isOptional = true
      this.#nextToken() // skip '?'
    }
    
    this.#nextToken() // skip ':'
    const type = this.#parseType()
    
    return { name, type, isOptional, isSpreaded }
  }
  
  #parseBody() {
    this.#skip() // '{'
    const body = []
    
    while (true) {
      if (this.#isPunc('}')) {
        this.#skip() // '}'
        return body
      }
      
      body.push(this.#parseStmt())
    }
  }
  
  
  // expr
  #parseIdent() {
    const ident = this.#nextToken()
    
    if(ident.value == 'new')
      return { type: 'new', keyword: ident, call: this.#parseCall(this.#nextToken()) }
    
    switch (true) {
      case this.#isPunc('('): return this.#parseCall(ident)
      case this.#isPunc('='): return this.#parseAssign(ident)
      default: return ident
    }
  }
  
  #parsePunc() {
    switch (true) {
      case this.#isPunc('<'): return this.#parseEle()
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
    const rOpen = this.#nextToken()
    const args = []
    
    if (this.#isPunc(')')) return { type: 'call', access, rOpen, rClose: this.#nextToken(), args }
    
    while (true) {
      const expr = this.#parseExpr()
      if(!expr || expr.type == 'err') return error(`cannot find end of argument list`, rOpen)
      args.push(expr)
      
      if(this.#isPunc(')')) return { type: 'call', access, rOpen, rClose: this.#nextToken(), args }
      
      args.at(-1).coma = this.#nextToken()
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
  
  #parseName() {
    const name = this.#nextToken()
    let generic = []
    
    if(this.#isPunc('<')) {
      this.#skip() // '<'
      
      let cClose
      
      if (this.#isPunc('>')) cClose = this.#nextToken()
      
      while (!cClose) {
        generic.push(this.#nextToken())
        
        if (this.#isPunc('>')) {
          cClose = this.#nextToken()
          break
        }
        
        this.#skip() // ','
      }
    }
    
    return { name, generic }
  }
  
  #mayDot(left) {
    if(!this.#isPunc('.')) return left
    
    this.#nextToken() // skip .
    const right = this.#nextToken()
    return this.#mayCall(this.#mayDot({ type: 'dot', left, right }))
  }
  
  
  // type
  #parseType() {
    const name = this.#nextToken()
    
    return this.#mayArrayType({ type: 'instance', name })
  }
  
  #mayArrayType(type) {
    if (this.#isPunc('[')) return this.#parseArrayType(type)
    return type
  }
  
  #parseArrayType(typ) {
    this.#skip() // skip '['
    this.#skip() // skip ']'
  
    return { type: 'array', typ }
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
  if(obj.type == 'punc') return obj.value
  
  return JSON.stringify(obj)
}

function error(msg, token) {
  return { type: 'err', msg, start: token.start, end: token.end }
}