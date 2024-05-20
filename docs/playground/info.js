export class InfoSeeker {
  static seek(ast, editor) {
    const index = editor.caret_index
    const len = editor.value.length
    
    ast.errors.forEach(err => {
      if(isInsideTok(index, err, len)) {
        editor.showInfo(`Error: ${err.msg}.`)
      }
    })
    
    ast.body.forEach(stmt => {
      if(stmt.type == 'call') {
        if(isInsideTok(index, stmt.access, len)) {
          this.editor.showInfo(stmt.typ)
        }
      }
    })
  }
}

function isInsideTok(index, tok, len) {
  const start = tok.start?.index ?? len - 1
  const end = tok.end?.index ?? len

  return index >= start && index <= end
}