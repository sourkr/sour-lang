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
      case this.#isKeyword('fun'): return this.#parseFun()
      case this.#isKeyword('class'): return this.#parseClass()
      case this.#isKeyword('export'): return this.#parseExport()
      case this.#isKeyword('import'): return this.#parseImport()
      case this.#isKeyword('return'): return this.#parseReturn()
      
      default: return this.#parseExpr()
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
    const keyword = this.#nextToken()
    const name    = this.#nextToken()
    const equal   = this.#nextToken()
    const value   = this.#parseExpr()
    
    return { type: 'var-dec', keyword, name, equal, value }
  }
  
  #parseFun() {
    const keyword = this.#nextToken()
    const name    = this.#nextToken()
    const rOpen = this.#nextToken()
    
    const params = []
    
    let rClose
    
    if(this.#isPunc(')')) rClose = this.#nextToken()
    
    while (!rClose) {
      const name = this.#nextToken()
      // const col = this.#nextToken()
      // const type = this.#nextToken()
      
      params.push(name)
      
      if(this.#isPunc(')')) {
        rClose = this.#nextToken()
        break
      }
      
      const coma = this.#nextToken()
    }
    
    const body    = this.#parseBody()
    
    return { type: 'fun-dec', keyword, name, body, params }
  }
  
  #parseClass() {
    const keyword = this.#nextToken()
    const name = this.#nextToken()
    var extend
    
    if(this.#isKeyword('extends')) {
      this.#nextToken()
      extend = this.#nextToken()
    }
    
    const body = this.#parseBody()
    
    return { type: 'cls-dec', keyword, name, body, extends: extend }
  }
  
  #parseExport() {
    this.#nextToken()
    
    return { type: 'export', stmt: this.#parseStmt() }
  }
  
  #parseImport() {
    this.#nextToken() // skip import
    this.#nextToken() // skip {
    
    const names = []
    
    let cClose
    
    if(this.#isPunc('}')) cClose = this.#nextToken()
    
    
    while(!cClose) {
      names.push(this.#nextToken())
      
      if (this.#isPunc('}')) {
        cClose = this.#nextToken()
        break
      }
      
      this.#nextToken() // skip ','
    }
    
    this.#nextToken() // skip 'form'
    
    const path = this.#nextToken()
    
    return { type: 'import', names, path }
  }
  
  #parseReturn() {
    this.#nextToken() // skip 'return'
    const value = this.#parseExpr()
    return { type: 'return', value }
  }
  
  #parseBody() {
    const cOpen  = this.#nextToken()
    const body   = []
    
    while (true) {
      if (this.#isPunc('}')) {
        const cClose = this.#nextToken()
        return { type: "body", cOpen, cClose, body }
      }
      
      const stmt = this.#parseStmt()
      body.push(stmt)
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
}

function stringify(obj) {
  if(obj.type == 'punc') return obj.value
  
  return JSON.stringify(obj)
}

function error(msg, token) {
  return { type: 'err', msg, start: token.start, end: token.end }
}