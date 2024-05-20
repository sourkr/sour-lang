import { Completion } from './sour-editor/completion.js';
import { BUILTINS } from '../src/sour-validator/builtin.js';
import { FunctionType } from '../src/sour-validator/types.js';

export class Completer {
  static global = BUILTINS
  
  static complete(ast, editor) {
    const index = editor.current_index
    const len = editor.value.length
    
    editor.showCompletion(this.listBody(ast.body, index, len))
  }
  
  static listBody(body, index, len) {
    for (let stmt of body) {
      if (stmt.type == 'ident') {
        if (isInsideTok(index, stmt, len)) {
          return this.listGlobals(stmt.value.substring(0, index - stmt.start.index))
        }
      }
      
      if (stmt.type == 'call') {
        const list = this.listBody(stmt.args, index, len)
        if(list.length) return list
      }
    }
    
    return []
  }
  
  static listGlobals(prefix) {
    // console.log(prefix)
    
    return [
      ...this.listFuns(prefix)
    ]
  }
  
  static listFuns(prefix) {
    const completions = []
    
    this.global.functions.forEach((funs, name) => {
      funs.forEach((ret, params) => {
        if(!name.startsWith(prefix)) return
        
        const type = new FunctionType(name, params, ret).toHTML()
        completions.push(new Completion(prefix, name.substring(prefix.length), type))
      })
    })
    
    return completions
  }
}

function isInsideTok(index, tok, len) {
  const start = tok.start?.index ?? len - 1
  const end = tok.end?.index ?? len
  
  return index >= start && index <= end
}