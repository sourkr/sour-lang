import { Color, Error } from './sour-editor/styles.js';

const red = 'red'
const blue = 'dodgerblue'
const violet = 'slateblue'
const green = 'green'
const gray = 'gray'

export class Liner {
  static lintAST(stylable, ast, length) {
    ast.body.forEach(stmt => this.lint(stylable, stmt))
    
    ast.errors.forEach(err => {
      stylable.apply(new Error(err.start?.index ?? length - 1, err.end?.index ?? length))
    })
  }
  
  static lint(stylable, stmt) {
    if(!stmt) return
    
    if (stmt.type == 'var') {
      this.lint_tok(stylable, stmt.kw, red)
      this.lint_type(stylable, stmt.valType)
      this.lint_tok(stylable, stmt.name, stmt.typ?.usage ? 'black' : gray)
      this.lint(stylable, stmt.val)
    }
    
    if(stmt.type == 'call') {
      this.lint_tok(stylable, stmt.access, blue)
      stmt.args.forEach(arg => this.lint(stylable, arg))
    }
    
    if(stmt.type == 'as') {
      this.lint(stylable, stmt.expr)
      this.lint_tok(stylable, stmt.kw, red)
      this.lint_type(stylable, stmt.castType)
    }
    
    if(stmt.type == 'str') this.lint_tok(stylable, stmt, green)
    if(stmt.type == 'char') this.lint_tok(stylable, stmt, green)
    if(stmt.type == 'int') this.lint_tok(stylable, stmt, violet)
    if(stmt.type == 'int') this.lint_tok(stylable, stmt, violet)
  }
  
  static lint_type(stylable, type) {
    if(!type) return
    
    if(type.type == 'instance') {
      this.lint_tok(stylable, type.name, red)
    }
  }
  
  static lint_tok(stylable, tok, color) {
    if(!tok) return
    stylable.apply(new Color(tok.start.index, tok.end.index, color))
  }
}