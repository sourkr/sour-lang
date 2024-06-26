import { Color, Error } from './sour-editor/styles.js';

const red = 'red'
const blue = 'dodgerblue'
const violet = 'slateblue'
const green = 'green'
const gray = 'gray'
const orange = 'orange'

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
      // this.lint_tok(stylable, stmt.name, stmt.typ?.usage ? 'black' : gray)
      this.lint(stylable, stmt.val)
    }
    
    if (stmt.type == 'const') {
      this.lint_tok(stylable, stmt.kw, red)
      this.lint_type(stylable, stmt.valType)
      // this.lint_tok(stylable, stmt.name, stmt.typ?.usage ? 'black' : gray)
      this.lint(stylable, stmt.val)
    }
    
    if (stmt.type == 'fun') {
      this.lint_tok(stylable, stmt.kw, red)
      this.lint_tok(stylable, stmt.name, blue)
      this.lint_type(stylable, stmt.ret)
      stmt.params?.forEach?.(param => this.lint(stylable, param))
      stmt.body?.forEach(stmt => this.lint(stylable, stmt))
    }
    
    if (stmt.type == 'class') {
      this.lint_tok(stylable, stmt.kw, red)
      // this.lint_type(stylable, stmt.valType)
      // this.lint_tok(stylable, stmt.name, stmt.typ?.usage ? 'black' : gray)
      stmt.body?.forEach(stmt => this.lint(stylable, stmt))
    }
    
    if (stmt.type == 'ret') {
      this.lint_tok(stylable, stmt.kw, red)
      this.lint(stylable, stmt.val)
    }
    
    if (stmt.type == 'if') {
      this.lint_tok(stylable, stmt.kw, red)
      this.lint(stylable, stmt.condition)
      stmt.body?.forEach(stmt => this.lint(stylable, stmt))
    }
    
    if(stmt.type == 'call') {
      if(stmt.access.type == 'dot') {
        // this.lint(stmt.left)
        this.lint_tok(stylable, stmt.access.right, blue)
      }
      
      this.lint_tok(stylable, stmt.access, blue)
      stmt.args.forEach(arg => this.lint(stylable, arg))
    }
    
    if(stmt.type == 'new') {
      stmt.args?.forEach(arg => this.lint(stylable, arg))
    }
    
    
    if(stmt.type == 'as') {
      this.lint(stylable, stmt.expr)
      this.lint_tok(stylable, stmt.kw, red)
      this.lint_type(stylable, stmt.castType)
    }
    
    if(stmt.type == 'neg') {
      this.lint_tok(stylable, stmt.sign, violet)
      this.lint(stylable, stmt.val)
    }
    
    if (stmt.type == 'new') {
      this.lint_tok(stylable, stmt.kw, red)
      // this.lint_type(stylable, stmt.valType)
      // this.lint_tok(stylable, stmt.name, stmt.typ?.usage ? 'black' : gray)
      // this.lint(stylable, stmt.val)
    }
    
    if (stmt.type == 'op') {
      this.lint(stylable, stmt.left)
      this.lint(stylable, stmt.right)
    }
    
    if (stmt.type == 'assign') {
      this.lint(stylable, stmt.access)
      this.lint(stylable, stmt.val)
    }
    
    if (stmt.type == 'dot') {
      this.lint(stylable, stmt.left)
      // this.lint(stylable, stmt.val)
    }
    
    if (stmt.type == 'param') {
      this.lint_tok(stylable, stmt.name, orange)
      this.lint_type(stylable, stmt.paramType)
    }
    
    if (stmt.type == 'cmt') {
      this.lint_tok(stylable, stmt, 'grey')
    }
    
    if (stmt.type == 'ident') {
      if(['this'].includes(stmt.value)) {
        this.lint_tok(stylable, stmt, red)
      }
    }
    
    if (stmt.type == 'str') this.lint_tok(stylable, stmt, green)
    if (stmt.type == 'char') this.lint_tok(stylable, stmt, green)
    if (stmt.type == 'int') this.lint_tok(stylable, stmt, violet)
    if (stmt.type == 'float') this.lint_tok(stylable, stmt, violet)
  }
  
  static lint_type(stylable, type) {
    if(!type) return
    
    if(type.type == 'instance') {
      this.lint_tok(stylable, type.name, red)
    }
  }
  
  static lint_tok(stylable, tok, color, len) {
    if(!tok) return
    if(!tok.start) return
    
    stylable.apply(new Color(tok.start.index, tok.end.index, color))
  }
}