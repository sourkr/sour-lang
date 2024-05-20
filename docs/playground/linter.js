
import { Color, Error } from './sour-editor/styles.js';

const blue = 'dodgerblue'
const violet = 'slateblue'
const green = 'green'

export class Liner {
  static lintAST(stylable, ast, length) {
    ast.body.forEach(stmt => this.lint(stylable, stmt))
    
    ast.errors.forEach(err => {
      stylable.apply(new Error(err.start?.index ?? length - 1, err.end?.index ?? length))
    })
  }
  
  static lint(stylable, stmt) {
    if(stmt.type == 'call') {
      this.lint_tok(stylable, stmt.access, blue)
      stmt.args.forEach(arg => this.lint(stylable, arg))
    }
    
    if(stmt.type == 'str') this.lint_tok(stylable, stmt, green)
  }
  
  static lint_tok(stylable, tok, color) {
    stylable.apply(new Color(tok.start.index, tok.end.index, color))
  }
}