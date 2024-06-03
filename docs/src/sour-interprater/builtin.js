import { BuiltinScope, Class, Instance } from './scope.js';

export const BUILTIN = new BuiltinScope()

const BYTE = new Class()
const INT = new Class()
const BOOL = new Class()
const STR = new Class()
const CHAR = new Class()


export const byte = create.bind(BYTE)
export const int = create.bind(INT)
export const str = create.bind(STR)
export const bool = create.bind(BOOL)
export const char = create.bind(CHAR)

// byte
{
  BYTE.def_meth('constructor', '', (self, value) => self.value = value << 24 >> 24)

  BYTE.def_meth('str', '()', self => str(self.value + ''))

  BUILTIN.classes.set('byte', BYTE)
}

// int
{
  INT.def_meth('constructor', '', (self, value) => self.value = value)
  
  INT.def_meth('equals', '(int)', (self, right) => bool(self.value === right.value))
  
  INT.def_meth('less_than', '(int)', (self, right) => bool(self.value < right.value))
  
  INT.def_meth('plus', '(int)', (self, right) => int(self.value + right.value))
  INT.def_meth('plus', '(str)', (self, right) => str(self.value + right.value))
  
  INT.def_meth('negative', '()', (self, right) => int(-self.value))
  
  INT.def_meth('str', '()', self => str(self.value + ''))
  
  BUILTIN.classes.set('int', INT)
}

// bool
{
  BOOL.def_meth('constructor', '', (self, value) => self.value = value)
  
  BOOL.def_meth('plus', '(str)', (self, right) => str(self.value + right.value))
  BOOL.def_meth('str', '()', self => str(self.value + ''))
  
  BUILTIN.classes.set('bool', BOOL)
}

// char
{
  CHAR.def_meth('constructor', '', (self, value) => self.value = value)
  CHAR.def_meth('equals', '(char)', (self, c) => bool(c.value == self.value))
  CHAR.def_meth('str', '()', self => str(String.fromCharCode(self.value)))
}

// str
{
  STR.def_meth('constructor', '', (self, value) => self.value = value)
  
  STR.def_meth('char_at', '(int)', (self, index) => char(self.value.charCodeAt(index.value)))
  
  STR.def_meth('plus', '(int)', (self, right) => str(self.value + right.value))
  STR.def_meth('plus', '(str)', (self, right) => str(self.value + right.value))
  
  STR.def_meth('str', '()', self => str(self.value))
  
  BUILTIN.classes.set('str', STR)
}


// Array
{
  const ARRAY = new Class()
  
  ARRAY.def_meth('constructor', '', (self, array) => {
    self.array = array
    self.constants.set('len', array.length)
  })
  
  ARRAY.def_meth('at', '(int)', (self, index) => self.array.at(index))
  ARRAY.def_meth('at', '(int,T)', (self, index, value) => value < 0 ? self.array[array.length + value] = value : self.array[index] = value)
  
  ARRAY.def_meth('str', '()', self => str(`[${self.array}]`))
  
  BUILTIN.classes.set('array', ARRAY)
}

function create(value) {
  const instance = this.instance()
  instance.get_meth('constructor', '')(instance, value)
  return instance
}