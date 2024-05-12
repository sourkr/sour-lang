function lint(code) {
  code = code
    .replaceAll(/(class|fun)\b/g, `<keydef>$1</keydef>`)
    .replaceAll(/(return|export|import)/g, `<key>$1</key>`)
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
        .replace(/\<.*?>|<\\\w+>/g, '')
  
      return `<cmt>${full}</cmt>`
    })
    
  return code
}

document.addEventListener("DOMContentLoaded", function() {
  const pres = document.querySelectorAll("code pre");
  
  for (const pre of pres) {
    const code = pre.innerText;
    const html = lint(code);
    pre.innerHTML = html;
  }
});
