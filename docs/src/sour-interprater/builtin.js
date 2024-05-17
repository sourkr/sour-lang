import { BuiltinScope, Class, Instance } from './scope.js';

export const BUILTIN = new BuiltinScope()

const ARRAY = new Class()

ARRAY.define_method('constructor', (self, array) => {
  self.constants.set('__value__', array)
  self.constants.set('len', array.length)
})

ARRAY.define_method('at', (self, index) => {
  const array = self.constants.get('__value__')
  return array.at(index)
})

ARRAY.define_method('at', (self, index, value) => {
  const array = self.constants.get('__value__')
  
  if(value < 0) array[array.length + value] = value
  array[index] = value
})

ARRAY.define_method('str', (self) => {
  const array = self.constants.get('__value__')
  return `[${array}]`
})

BUILTIN.classes.set('array', ARRAY)