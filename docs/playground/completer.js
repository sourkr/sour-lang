export class Completer {
  static complete(ast, editor) {
    editor.showCompletion([ 'print' ])
  }
}