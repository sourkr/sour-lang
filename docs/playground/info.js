import { BUILTINS } from '../src/sour-validator/builtin.js';
import { FunctionType, VarType } from '../src/sour-validator/types.js';

export class InfoSeeker {
  static global = BUILTINS
  
  static seek(ast, editor) {
    const index = editor.current_index
    const len = editor.value.length
    
    for(let err of ast.errors) {
      if (isInsideTok(index, err, len)) {
        editor.showInfo(`Error: ${err.msg}.`)
        return
      }
    }
    
    const info = this.seekBody(ast.body, index, len)
    if(info) editor.showInfo(info)
  }
  
  static seekBody(body, index, len) {
    for(let stmt of body) {
      const info = this.seekStmt(stmt, index, len)
      if(info) return info
    }
  }
  
  static seekStmt(stmt, index, len) {
    if (stmt.type == 'ident') {
      return stmt.typ.toHTML()
    }
    
    if (stmt.type == 'var') {
      if (isInsideTok(index, stmt.name, len)) {
        const type = new VarType(stmt.name.value, stmt.typ)
        return type.toHTML()
      }
    }
    
    if (stmt.type == 'call') {
      if (isInsideTok(index, stmt.access, len)) {
        const args = stmt.args.map(arg => arg.typ)
        const name = stmt.access.value
        const fun = [...this.global.get_funs(name).entries()]
          .find(entry => entry[0].isAssignableTo(args))
    
        const type = new FunctionType(name, ...fun)
    
        return type.toHTML() + '<hr>' + fun[1].info
      }
      
      const info = this.seekBody(stmt.args, index, len)
      if(info) return info
    }
    
    if (stmt.type == 'class') {
      const name = stmt.name.value
      
      if (isInsideTok(index, stmt.name, len)) {
        return `<span style="color:red">class</span> ${name}`
      }
      
      for(let stmt2 of stmt.body) {
        if (stmt2?.type == 'var') {
          if (isInsideTok(index, stmt2.name, len)) {
            const type = new VarType(`${name}.${stmt2.name.value}`, stmt2.val.typ)
            return type.toHTML()
          }
        }
        
        if (stmt2?.type == 'fun') {
          if (isInsideTok(index, stmt2.name, len)) {
            return `<span style="color:red">fun</span> ${stmt2.name.value}(): ${stmt2.typ.toHTML()}`
          }
          
          const info = this.seekBody(stmt2.body, index, len)
          if(info) return info
        }
      }
    }
  }
}

function isInsideTok(index, tok, len) {
  const start = tok.start?.index ?? len - 1
  const end = tok.end?.index ?? len
  
  return index >= start && index <= end
}