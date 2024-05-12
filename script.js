const tag = /<(?<tag>.*?)>(.*?)<\/\k<tag>>/g
const version = '0.1 Beta'

function lint(code) {
  code = code
    .replaceAll(/(class|fun)\b/g, `<keydef>$1</keydef>`)
    .replaceAll(/(return|export|import|new)/g, `<key>$1</key>`)
    .replace(/\b(\d+)/gm, `<num>$1</num>`)
    .replace(/(true|false)/gm, `<bool>$1</bool>`)
    .replace(/(\w+)\(/g, `<fname>$1</fname>(`)
    .replace(/([(+){=}])/g, `<punc>$1</punc>`)
    .replace(/\b([A-Z]\w+)/g, `<cls>$1</cls>`)
    .replace(/(var) (\w+)/g, `<keydef>$1</keydef> <vname>$2</vname>`)
    
  code = code
    .replace(/".*?(?<!\\)"/g, full => {
      full = full
        .replace(/\<\w+>|<\\\w+>/g, '')
      
      return `<str>${full}</str>`
    })
  
  
  code = code
    .replace(/\/\/.*$/gm, full => {
      full = full
        .replace(tag, '$2')
        .replaceAll('<', '&lt;')
        
      return `<cmt>${full}</cmt>`
    })
    
  return code
}

document.addEventListener("DOMContentLoaded", function() {
  header()
  highlight()
});

function highlight() {
  const pres = document.querySelectorAll("pre");
  
  for (const pre of pres) {
    const code = pre.innerText;
    const html = lint(code);
    pre.innerHTML = html;
  }
}

function header() {
  document.querySelector('.subtitle').innerText = version
}