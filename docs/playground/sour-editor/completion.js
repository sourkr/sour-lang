export class Completion {
  constructor(prefix, sufix, type = '', info = '') {
    this.sufix = sufix
    this.prefix = prefix
    this.type = type
    this.info = info
  }
  
  get name() {
    return `<b>${this.prefix}</b>${this.sufix}`
  }
  
  get details() {
    if(!this.type) return ''
    return `${this.type}${this.info ? `<hr>${this.info}` : ''}`
  }
}