// import { Validator } from '../sour-validator/validator.js';
import { Parser } from '../sour-parser/parser.js';
import { create } from './builtin.js';
import { Scope, Class } from './scope.js';

export class Interprater {
  #global
  #exports = new Scope()
  #file = 'main.sour'
  #root = '/'
  #imported
  
  constructor(outputListener) {
    this.#global = new Scope(create(outputListener))
    this.#global.toString().then(console.log())
  }
  
  async interprate(root, file, imported = new Map()) {
    this.#root = root
    this.#file = file
    this.#imported = imported
    
    this.interprateCode(await (await fetch(new URL(file, root))).text())
  }
  
  async interprateCode(code) {
    const parser = new Parser(code)
    
    let stmt
    
    while ((stmt = parser.next()) != null)
      await this.#interprateStmt(stmt)
  }
  
  async #interprateStmt(stmt, self = this.#global, local = this.#global, isExport = false) {
    if (stmt.type == 'err') this.#error(stmt)
    
    if (stmt.type == 'var-dec') {
      const name = stmt.name.value
      const value = await this.#interprateExpr(stmt.value, self)
      
      self.define(name, value)
      
      if(isExport) this.#exports.define(name, value)
    }
    
    if (stmt.type == 'fun-dec') {
      const fun = async (...args) => {
        // console.log(await local?.toString())
        const scope = new Scope(self)
        stmt.params.forEach((param, i) => scope.define(param.value, args[i]))
        return await this.#interprateBody(stmt.body.body, scope, local)
      }
      
       self.define(stmt.name.value, fun)
    }
    
    if (stmt.type == 'cls-dec') {
      const cls = new Class()
      
      cls.instance = async (child, ...args) => {
        const instance = new Scope()
        
        instance.set('this', instance)
        
        if(stmt.extends) {
          const sCls = this.#global.get(stmt.extends.value)
          const sup = await sCls.instance(instance)
          instance.parent = sup
          instance.define('super', sup)
        }
        
        await this.#interprateBody(stmt.body.body, instance, child)
        
        if(!child) {
          const constructor = instance.get('constructor')
          if(constructor) await constructor(...args)
        }
        
        return instance
      }
      
      cls.toString = () => `[class ${stmt.name.value}]`
      
      this.#global.define(stmt.name.value, cls)
      if(isExport) this.#exports.define(stmt.name.value, cls)
    }
    
    if (stmt.type == 'import') {
      const path = stmt.path.value
      
      let exports
      
      if (this.#imported.has(path)) exports = this.#imported.get(path)
      else {
        const interprater = new Interprater()
        await interprater.interprate(this.#root, path.replaceAll('.', '/') + '.sour')
        exports = interprater.#exports
        this.#imported.set(path, exports)
      }
      
      stmt.names.forEach(name => this.#global.define(name.value, exports.get(name.value)))
    }
    
    if (stmt.type == 'export') {
      await this.#interprateStmt(stmt.stmt, this.#global, null, true)
    }
    
    await this.#interprateExpr(stmt, self, local)
  }
  
  async #interprateBody(body, self, local) {
    for(let stmt of body) {
      if(stmt.type == 'return') return await this.#interprateExpr(stmt.value, self)
      
      await this.#interprateStmt(stmt, self, local)
    }
  }
  
  async #interprateExpr(expr, self, local) {
    if(expr == null) return
    
    if(expr.type == 'num') return parseInt(expr.value)
    if(expr.type == 'str') return expr.value
    
    if(expr.type == 'ident') {
      const name = expr.value
      
      if(name == 'super') return self.get(name)
      
      // if(name == 'onCreate') console.log(name, await local?.toString())
      if(local?.has(name)) return local.get(name)
      if(self?.has(name)) return self.get(name)
      return this.#global.get(expr.value)
    }
    
    if(expr.type == 'call') {
      const fun = await this.#interprateExpr(expr.access, self, local)
      if(!fun) throw new Error(`function ${str(expr.access)} donot exits as runtime.`)
      
      const args = await Promise.all(expr.args.map(arg => this.#interprateExpr(arg, self, local)))
      
      if(fun instanceof Scope) {
        const constructor = fun.get('constructor')
        if(constructor) await constructor(...args)
        return
      }
      
      return await fun(...args)
    }
    
    if(expr.type == 'new') {
      const cls = this.#global.get(expr.call.access.value)
      const args = await Promise.all(expr.call.args.map(arg => this.#interprateExpr(arg, self, local)))
      return await cls.instance(null, ...args)
    }
    
    if (expr.type == 'assign') {
      const value = await this.#interprateExpr(expr.value, self, local)
      self.set(expr.name.value, value)
      // console.log(self.parent?.toString())
    }
    
    if (expr.type == 'dot') {
      var left = await this.#interprateExpr(expr.left, self, local)
      return await this.#interprateExpr(expr.right, null, left)
    }
    
    if (expr.type == 'ele') {
      const cls = this.#global.get(expr.name.value)
      const ins = await cls.instance()
      return await ins.get("render")()
    }
  }
  
  #error({ msg, start }) {
    throw new Error(`${msg} at (${start?.index}) ${start?.line}:${start?.col} in ${this.#file}`)
  }
}

function str(expr) {
  if(expr.type == 'ident') return expr.value
  if(expr.type == 'dot') return `${str(expr.left)}.${str(expr.right)}`
}