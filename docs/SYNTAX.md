# SourLang Syntax (Conceptual Outline)

This document outlines the basic syntax planned for SourLang.

## Functions
- Functions are defined using the `func` keyword.
- Exported functions (especially `main`) use `export func`.
- Type annotations are used for parameters and return types (e.g., `func myFunc(param: type): returnType`).
- `void` is used for functions that do not return a value.
  Example:
  ```sour
  export func main(): void {
      // ...
  }
  func print(ch: char): void {
      // ...
  }
  ```

## Variables & Arrays
- Variable declaration implies type (though explicit type might be needed, e.g. `int i`).
- Arrays are declared with type and size: `type[size] name`.
- Array instantiation: `new type[size]`.
  Example:
  ```sour
  char[2] str = new char[2]
  str[0] = 'a'
  ```

## Control Flow
- **For loops**:
  ```sour
  for(int i = 0; i < 2; i++)
      print(str[i])
  ```
- **If/Else statements**:
  ```sour
  if (b > 9) {
      // block for if
  } else // single statement for else
      // or
      // else { block for else } 
  ```
  (Note: The example shows `else print(...)` without braces, implying single statements are allowed. Braces for blocks.)


## Expressions
- Basic arithmetic: `+`, `/`, `%`.
- Type casting: `(char) b`.

## Built-ins / System Calls
- `print()`: Overloaded for different types (char, byte shown).
- `wasm("...")`: Allows embedding raw WebAssembly instructions/mnemonics.
  Example:
  ```sour
  wasm("local.get $ch")
  wasm("call sys.out")
  ```

## Comments
- Single-line comments: `// comment text`
- Multi-line comments: `/* ... */`

## Semicolons
- No semicolons are used to terminate statements.
