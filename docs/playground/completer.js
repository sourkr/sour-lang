import { Completion } from './sour-editor/completion.js';
import { BUILTINS } from '../src/sour-validator/builtin.js';
import { GlobalScope, FunctionType, VarType } from '../src/sour-validator/types.js';

export class Completer {
  static global = new GlobalScope(BUILTINS)
  
  static complete(ast, editor) {
    const index = editor.current_index
    const len = editor.value.length
    
    this.global = new GlobalScope(BUILTINS)
    
    editor.showCompletion(this.listBody(ast.body, index, len))
  }
  
  static listBody(body, index, len) {
    for (let stmt of body) {
      if (stmt.type == 'var') {
        this.global.def_var(stmt.name?.value, stmt.val?.typ)
      }
      
      if (stmt.type == 'call') {
        const list = this.listBody(stmt.args, index, len)
        if(list.length) return list
      }
      
      if (stmt.type == 'ident') {
        if (isInsideTok(index, stmt, len)) {
          return this.listGlobals(stmt.value.substring(0, index - stmt.start.index))
        }
      }
    }
    
    return []
  }
  
  static listGlobals(prefix) {
    // console.log(prefix)
    
    return [
      ...this.listKw(prefix),
      ...this.listVars(prefix),
      ...this.listFuns(prefix)
    ]
  }
  
  static listKw(prefix) {
    return ['var']
      .filter(kw => kw.startsWith(prefix))
      .map(kw => new Completion(prefix, kw.substring(prefix.length)))
  }
  
  static listVars(prefix) {
    const completions = []
    
    // console.log(this.global.get_vars())
    
    this.global.get_vars().forEach((type, name) => {
      if(!name) return
      if(!name.startsWith(prefix)) return
      
      
      const typ = new VarType(name, type).toHTML()
      completions.push(new Completion(prefix, name.substring(prefix.length), typ))
    })
    
    return completions
  }
  
  static listFuns(prefix) {
    const completions = []
    
    this.global.get_funs().forEach((funs, name) => {
      funs.forEach((ret, params) => {
        if(!name.startsWith(prefix)) return
        
        const type = new FunctionType(name, params, ret).toHTML()
        completions.push(new Completion(prefix, name.substring(prefix.length), type, ret.info))
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