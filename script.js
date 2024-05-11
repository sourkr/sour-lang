function highlightSour(code) {
  code = code
    .replaceAll(/(class|fun)\b/g, `<key-def>$1</key-def>`)
    .replaceAll(/(return|export|import)/g, `<key>$1</key>`)
    .replace(/\b(\d+)/gm, `<num>$1</num>`)
    .replace(/(true|false)/gm, `<bool>$1</bool>`)
    .replace(/(\w+)\(/g, `<fname>$1</fname>(`)
    .replace(/([(+){=}])/g, `<punc>$1</punc>`)
    .replace(/\b([A-Z]\w+)/g, `<cls>$1</cls>`)
    .replace(/(var) (\w+)/g, `<key-def>$1</key-def> <vname>$2</vname>`)
    
  code = code
    .replace(/\/\/.*$/gm, full => {
      full = full
        .replace(/\<.*?>|<\\\w+>/g, '')
        
      return `<cmt>${full}</cmt>`
    })
    
  code = code
    .replace(/".*?"/g, full => {
      full = full
        .replace(/\<\w+>|<\\\w+>/g, '')
      
      return `<str>${full}</str>`
    })
    
  return code
}

document.addEventListener("DOMContentLoaded", function() {
  highlightSourCode();
});

function highlightSourCode() {
  const codeElements = document.querySelectorAll("pre.code");
  for (const element of codeElements) {
    const code = element.textContent;
    const highlightedHTML = highlightSour(code);
    element.innerHTML = highlightedHTML;
  }
}
