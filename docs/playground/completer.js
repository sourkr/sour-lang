import { Completion } from './sour-editor/completion.js';
import { BUILTINS } from '../src/sour-validator/builtin.js';
import { GlobalScope, MethodScope, FunctionType, VarType, InstanceType, MethodType, ClassType } from '../src/sour-validator/types.js';

export class Completer {
  static global = new GlobalScope(BUILTINS)
  
  static complete(ast, editor) {
    const index = editor.current_index
    const len = editor.value.length
    
    this.global = new GlobalScope(BUILTINS)
    
    editor.showCompletion(this.listBody(ast.body, index, len))
  }
  
  static listBody(body, index, len, scope = this.global) {
    for (let stmt of body) {
      if(!stmt) continue
      
      if (stmt.type == 'var') {
        if(isInsideTok(index, stmt.valType?.name, len))
          return this.listTypes(stmt.valType.name.value.substring(0, index - stmt.valType?.name?.start?.index))
        
        this.global.def_var(stmt.name?.value, stmt.typ)
      }
      
      if (stmt.type == 'call') {
        const list = this.listBody(stmt.args, index, len, scope)
        if(list.length) return list
      }
      
      if (stmt.type == 'dot') {
        if (isInsideTok(index, stmt.right, len)) {
          return [
            ...this.listFields(stmt.right.value.substring(0, index - stmt.right.start.index), stmt.left.typ),
            ...this.listMeths(stmt.right.value.substring(0, index - stmt.right.start.index), stmt.left.typ)
          ]
        }
      }
      
      if (stmt.type == 'ident') {
        if (isInsideTok(index, stmt, len)) {
          return this.listGlobals(stmt.value.substring(0, index - stmt.start.index), scope)
        }
      }
      
      if (stmt.type == 'class') {
        const cls = new ClassType(stmt.name.value, [])
        
        for(let stmt2 of stmt.body) {
          if(!stmt2) continue
          
          if(stmt2.type == 'ident') {
            if (isInsideTok(index, stmt2, len)) {
              const name = stmt2.value
              return this.listKw(name.substring(0, index - stmt2.start.index), ['var', 'fun'])
            }
          }
          
          if(stmt2.type == 'var') {
            if (isInsideTok(index, stmt2.valType?.name, len))
              return this.listTypes(stmt2.valType.name.value.substring(0, index - stmt2.valType?.name?.start?.index))
            
            cls.def_field(stmt2.name?.value, stmt2.val.typ)
          }
          
          if(stmt2.type == 'fun') {
            const mScope = new MethodScope(this.global, cls)
            const list = this.listType(stmt2.ret, index, len)
            
            list.push(...this.listBody(stmt2.body, index, len, mScope))
            
            if (list.length) return list
          }
        }
      
        
        
        // const list = this.listBody(stmt.body, index, len)
        // if(list.length) return list
      }
      
      if (stmt.type == 'fun') {
        var list = this.listType(stmt.ret, index, len)
        list.push(...this.listBody(stmt.body, index, len))
        
        if (list.length) return list
      }
    }
    
    return []
  }
  
  static listType(type, index, len) {
    if(!type) return []
    
    if(type.type == 'instance') {
      if(isInsideTok(index, type.name, len)) {
        return this.listTypes(type.name.value.substring(0, index - type.name.start.index))
      }
    }
    
    return []
  }
  
  static listGlobals(prefix, scope) {
    // console.log(prefix)
    return [
      ...this.listKw(prefix),
      ...this.listVars(prefix),
      ...this.listFields(prefix, scope),
      ...this.listFuns(prefix),
    ]
  }
  
  static listKw(prefix, list) {
    return (list || ['var', 'class', 'new', 'as', 'fun'])
      .filter(kw => kw.startsWith(prefix))
      .map(kw => new Completion(prefix, kw.substring(prefix.length)))
  }
  
  static listVars(prefix) {
    const completions = []
    
    this.global.get_vars().forEach((type, name) => {
      if(!name) return
      if(!name.startsWith(prefix)) return
      // console.log(name, type)
      const typ = new VarType(name, type).toHTML()
      completions.push(new Completion(prefix, name.substring(prefix.length), typ))
    })
    
    return completions
  }
  
  
  static listFuns(prefix) {
    const completions = []
    
    this.global.get_funs().forEach((funs, name) => {
      if(!name.startsWith(prefix)) return
        
      funs.forEach((ret, params) => {
        
        const type = new FunctionType(name, params, ret).toHTML()
        completions.push(new Completion(prefix, name.substring(prefix.length), type, ret.info))
      })
    })
    
    return completions
  }
  
  static listTypes(prefix) {
    const completions = ['any', 'void']
      .filter(e => e.startsWith(prefix))
      .map(e => new Completion(prefix, e.substring(prefix.length)))
    
    this.global.get_classes().forEach((cls, name) => {
      if (!name.startsWith(prefix)) return
      if (name == prefix) return
    
      // const type = new InstanceType(cls).toHTML()
      completions.push(new Completion(prefix, name.substring(prefix.length)))
    })
    
    return completions
  }
  
  static listFields(prefix, scope) {
    const completions = []
    // console.log(scope)
    if (scope instanceof MethodScope) {
      scope.get_fields().forEach((type, name) => {
        if (!name.startsWith(prefix)) return
      
        const typ = `${scope.class.name}.${name}: ${type?.toHTML()}`
        completions.push(new Completion(prefix, name.substring(prefix.length), typ))
      })
      
      return completions
    }
    
    if (scope instanceof InstanceType) {
      const instance = scope
      
      instance.get_vars().forEach((type, name) => {
        if (!name.startsWith(prefix)) return
      
        const typ = `${instance.class.name}.${name}: ${type.toHTML()}`
        completions.push(new Completion(prefix, name.substring(prefix.length), typ))
      })
    }
    
    return completions
  }
  
  static listMeths(prefix, instance) {
    const completions = []
  
    instance.get_meths().forEach((meths, name) => {
      if (!name.startsWith(prefix)) return
        
      meths.forEach((ret, params) => {
        const type = new MethodType(instance.class, name, params, ret).toHTML()
        completions.push(new Completion(prefix, name.substring(prefix.length), type))
      })
    })
  
    return completions
  }
}

function isInsideTok(index, tok, len) {
  if(!tok) return false
  
  const start = tok.start?.index ?? len - 1
  const end = tok.end?.index ?? len
  
  return index >= start && index <= end
}