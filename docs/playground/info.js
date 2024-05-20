import { BUILTINS } from '../src/sour-validator/builtin.js';
import { FunctionType } from '../src/sour-validator/types.js';

export class InfoSeeker {
  static global = BUILTINS
  
  static seek(ast, editor) {
    const index = editor.current_index
    const len = editor.value.length
    
    ast.errors.forEach(err => {
      if(isInsideTok(index, err, len)) {
        editor.showInfo(`Error: ${err.msg}.`)
      }
    })
    
    ast.body.forEach(stmt => {
      if(stmt.type == 'call') {
        if(isInsideTok(index, stmt.access, len)) {
          const args = stmt.args.map(arg => arg.typ)
          const name = stmt.access.value
          const fun = [...this.global.functions.get(name).entries()]
            .find(entry => entry[0].isAssignableTo(args))
          
          const type = new FunctionType(name, ...fun)
          
          editor.showInfo(type.toHTML())
        }
      }
    })
  }
}

function isInsideTok(index, tok, len) {
  const start = tok.start?.index ?? len - 1
  const end = tok.end?.index ?? len
  
  return index >= start && index <= end
}