const puncs = '{:}[,](<=>)+-*&|.?;'

const isDigit = c => /\d/.test(c)
const isIdent = c => /[a-zA-Z_]/.test(c)

const EOF = '\u0000'

class CharStream {
  line = 1
  col = 1
  index = 0
  
  constructor(input) {
    this.input = input
  }

  peek(n) {
    return this.input[this.index + (n || 0)] || EOF
  }

  next() {
    const char = this.input[this.index++] || EOF

    if (char === '\n') {
      this.line++
      this.col = 1
    } else {
      this.col++
    }

    return char || null
  }

  eof() {
    return this.index >= this.input.length
  }

  pos() {
    return {
      index: this.index,
      line: this.line,
      col: this.col,
    }
  }
}

export class Tokenizer {
  #stream
  #token
  
  constructor(input) {
    this.#stream = new CharStream(input)
  }
  
  peek() {
    if(this.#token) return this.#token
    return this.#token = this.#nextTok()
  }
  
  next() {
    if(this.#token) {
      const temp = this.#token
      this.#token = null
      // console.log(temp)
      return temp
    }
    
    let n = this.#nextTok()
    // console.log(n)
    return n
    // return this.#nextTok()
  }

  #nextTok() {
    const c = this.#stream.peek()
    const start = this.#stream.pos()
    
    switch (true) {
      case /\s/.test(c)     : return this.#stream.next() && this.#nextTok()
      case isDigit(c)       : return this.#parseNum(start)
      case isIdent(c)       : return token('ident', this.#readWhile(isIdent), start, this.#stream.pos())
      case c == '/'         : return this.#parseSlash(start)
      case puncs.includes(c): return token('punc', this.#stream.next(), start, this.#stream.pos())
      case c == '"'         : return this.#parseStr(start)
      case c == "'"         : return this.#parseChar(start)
      case c == EOF         : return token('eof', 'end of file', start, this.#stream.pos())
      default               : return token('unknown', this.#stream.next(), start, this.#stream.pos())
    }
  }
  
  #readWhile(predicate) {
    let str = ""
    while(predicate(this.#stream.peek()))
      str += this.#stream.next()
    return str
  }
  
  #parseNum(start) {
    let str = this.#readWhile(isDigit)
    
    if(this.#stream.peek() == '.' && isDigit(this.#stream.peek(1)))
      str += this.#stream.next() + this.#readWhile(isDigit)
    
    return token('num', str, start, this.#stream.pos())
  }
  
  #parseSlash(start) {
    this.#stream.next()
    
    if(this.#stream.peek() == '/') {
      this.#stream.next()
      const str = this.#readWhile(c => !(c == '\n' || c == EOF))
      return token('cmt', str, start, this.#stream.pos())
    }
    
    if(this.#stream.peek() == '*') {
      const str = this.#parseMultilineCmt()
      return token('cmt', str, start, this.#stream.pos())
    }
    
    return token('punc', '/', start, this.#stream.pos())
  }
  
  /**
   * Must be called after * is matched and
   * the / is consumed.
   */
  #parseMultilineCmt() {
    this.#stream.next() // skip *
    let str = this.#readWhile(c => !(c == '*' || c == EOF))
    // this.#stream.next()
    if(this.#stream.peek(1) != '/') str += '*' + this.#parseMultilineCmt()
    else {
      this.#stream.next()
      this.#stream.next()
    }
    return str
  }
  
  #parseStr(start) {
    this.#stream.next() // skip '"'
    
    let str = '"' + this.#readWhile(c => !(c == '"' || c == '\\' || c == EOF))
    
    if (this.#stream.peek() == '\\') {
      this.#stream.next()
      str += this.#stream.peek() + this.#parseStr().value
    }
    
    if (this.#stream.peek() == EOF) {
      const err = error(`cannot find end of string`, this.#stream.pos())
      return token('str', str, start, this.#stream.pos(), err)
    }
    
    this.#stream.next()
    return token('str', str + '"', start, this.#stream.pos())
  }
  
  #parseChar(start) {
    let str = this.#stream.next()
    
    if(this.#stream.peek() == '\\')
      str += this.#stream.next()
    
    str += this.#stream.next() + this.#stream.next()
    
    return token('char', str, start, this.#stream.next())
  }
}

function error(msg, pos) {
  return {
    type: 'err',
    msg,
    start: { index: pos.index - 1, line: pos.line, col: pos.col - 1 },
    end: pos
  }
}

function token(type, value, start, end, err) {
  return { type, value, start, end, err } 
}