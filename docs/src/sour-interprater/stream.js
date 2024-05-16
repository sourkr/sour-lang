export class Stream {
  #stack = []
  #read
  
  read() {
    return new Promise(resolve => {
      if (this.#stack.length) resolve(this.#stack.pop())
      else this.#read = resolve
    })
  }
  
  write(str) {
    if(this.#read) {
      this.#read(str)
      this.#read = null
    } else this.#stack.push(str)
  }
}