import { Scope, Class } from './scope.js';

export function create(onOutput) {
  const BUILTIN = new Scope()

  BUILTIN.define("null", null)

  BUILTIN.define('print', async msg => {
    if (msg instanceof Scope) onOutput(await msg.str())
    else if (msg instanceof Class) onOutput(msg.toString())
    else if (typeof msg == 'function') onOutput('<Function>')

    else onOutput(msg)
  })

  // dom
  {
    BUILTIN.define('doc_body', document.body)

    BUILTIN.define('create_element', document.createElement.bind(document))
    BUILTIN.define('create_text', document.createTextNode.bind(document))

    BUILTIN.define('append_child', (parent, child) => parent.appendChild(child))
    BUILTIN.define('style_set', (parent, prop, val) => parent.style.setProperty(prop, val))
  }

  // js
  {
    BUILTIN.define('js', eval)
    BUILTIN.define('js_fun_call', (str, ...args) => eval(str)(...args))

    BUILTIN.define('js_set', (obj, prop, val) => obj[prop] = val)
    BUILTIN.define('js_get', (obj, prop) => obj[prop])
    BUILTIN.define('js_meth_call', (obj, name, ...args) => obj[name](...args))
  }
  
  return BUILTIN
}