import { BuiltinScope, Class, Instance } from './scope.js';

export const BUILTIN = new BuiltinScope()

const BYTE = new Class()
const INT = new Class()
const BOOL = new Class()
const STR = new Class()


export const byte = create.bind(BYTE)
export const int = create.bind(INT)
export const str = create.bind(STR)
export const bool = create.bind(BOOL)

// byte
{
  BYTE.define_method('constructor', '', (self, value) => self.value = value << 24 >> 24)

  BYTE.define_method('str', '()', self => self.value + '')

  BUILTIN.classes.set('byte', BYTE)
}

// int
{
  INT.define_method('constructor', '', (self, value) => self.value = value)
  
  INT.define_method('equals', '(int)', (self, right) => bool(self.value === right.value))
  
  INT.define_method('less_than', '(int)', (self, right) => bool(self.value < right.value))
  
  INT.define_method('plus', '(int)', (self, right) => int(self.value + right.value))
  INT.define_method('plus', '(str)', (self, right) => str(self.value + right.value))
  
  INT.define_method('str', '()', self => self.value + '')
  
  BUILTIN.classes.set('int', INT)
}

// bool
{
  BOOL.define_method('constructor', '', (self, value) => self.value = value)
  
  BOOL.define_method('plus', '(str)', (self, right) => str(self.value + right.value))
  
  BOOL.define_method('str', '()', self => self.value + '')
  
  BUILTIN.classes.set('bool', BOOL)
}


// str
{
  STR.define_method('constructor', '', (self, value) => self.value = value)
  
  STR.define_method('plus', '(int)', (self, right) => str(self.value + right.value))
  STR.define_method('plus', '(str)', (self, right) => str(self.value + right.value))
  
  STR.define_method('str', '()', self => self.value)
  
  BUILTIN.classes.set('str', STR)
}



// Array
{
  const ARRAY = new Class()
  
  ARRAY.define_method('constructor', '', (self, array) => {
    self.array = array
    self.constants.set('len', array.length)
  })
  
  ARRAY.define_method('at', '(int)', (self, index) => self.array.at(index))
  ARRAY.define_method('at', '(int,T)', (self, index, value) => value < 0 ? self.array[array.length + value] = value : self.array[index] = value)
  
  ARRAY.define_method('str', '()', self => `[${self.array}]`)
  
  BUILTIN.classes.set('array', ARRAY)
}

function create(value) {
  const instance = this.instance()
  instance.get_method('constructor', '')(instance, value)
  return instance
}