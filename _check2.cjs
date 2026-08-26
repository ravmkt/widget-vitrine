const fs = require('fs');
const code = fs.readFileSync('public/widget.js', 'utf8');

let stack = [];
let line = 1, col = 0;
let i = 0;
const len = code.length;

function advance(n = 1) {
  for (let k = 0; k < n; k++) {
    if (code[i] === '\n') { line++; col = 0; } else { col++; }
    i++;
  }
}

while (i < len) {
  const c = code[i];

  // Comentário de linha
  if (c === '/' && code[i+1] === '/') {
    while (i < len && code[i] !== '\n') advance();
    continue;
  }
  // Comentário de bloco
  if (c === '/' && code[i+1] === '*') {
    advance(2);
    while (i < len && !(code[i] === '*' && code[i+1] === '/')) advance();
    advance(2);
    continue;
  }
  // String simples/duplas
  if (c === '"' || c === "'") {
    const quote = c;
    advance();
    while (i < len && code[i] !== quote) {
      if (code[i] === '\\') advance(2); else advance();
    }
    advance();
    continue;
  }
  // Template literal (trata ${} internamente com profundidade)
  if (c === '`') {
    advance();
    while (i < len && code[i] !== '`') {
      if (code[i] === '\\') { advance(2); continue; }
      if (code[i] === '$' && code[i+1] === '{') {
        advance(2);
        let depth = 1;
        while (i < len && depth > 0) {
          if (code[i] === '{') depth++;
          if (code[i] === '}') depth--;
          if (code[i] === '`') {
            // template dentro de template - pular recursivamente (simplificado)
            advance();
            while (i < len && code[i] !== '`') advance();
          }
          advance();
        }
        continue;
      }
      advance();
    }
    advance();
    continue;
  }

  if (c === '{' || c === '(' || c === '[') {
    stack.push({ c, line, col });
    advance();
    continue;
  }
  if (c === '}' || c === ')' || c === ']') {
    const map = { '}': '{', ')': '(', ']': '[' };
    const top = stack[stack.length - 1];
    if (!top || top.c !== map[c]) {
      console.log(`MISMATCH at ${line}:${col} -> found '${c}', stack top: ${top ? top.c + ' at ' + top.line + ':' + top.col : 'EMPTY'}`);
      process.exit(1);
    }
    stack.pop();
    advance();
    continue;
  }

  advance();
}

if (stack.length === 0) {
  console.log('OK - balanceado corretamente');
} else {
  console.log(`Remaining unclosed (${stack.length}):`);
  for (let k = stack.length - 1; k >= 0; k--) {
    console.log("  '" + stack[k].c + "' opened at " + stack[k].line + ':' + stack[k].col);
  }
}
