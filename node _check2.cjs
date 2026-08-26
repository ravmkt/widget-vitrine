const fs = require('fs');
const code = fs.readFileSync('public/widget.js', 'utf8');

let stack = [];
let line = 1, col = 0;
let i = 0;
const len = code.length;
let lastSignificant = ''; // último token significativo (para decidir regex vs divisão)

function advance(n = 1) {
  for (let k = 0; k < n; k++) {
    if (code[i] === '\n') { line++; col = 0; } else { col++; }
    i++;
  }
}

const regexNotAllowedAfter = /[\w$\])\]]$/; // identificador, número, ), ]

while (i < len) {
  const c = code[i];

  if (c === '/' && code[i+1] === '/') {
    while (i < len && code[i] !== '\n') advance();
    continue;
  }
  if (c === '/' && code[i+1] === '*') {
    advance(2);
    while (i < len && !(code[i] === '*' && code[i+1] === '/')) advance();
    advance(2);
    continue;
  }
  if (c === '"' || c === "'") {
    const quote = c;
    const startLine = line, startCol = col;
    advance();
    while (i < len && code[i] !== quote) {
      if (code[i] === '\\') advance(2); else advance();
      if (code[i-1] === '\n' && code[i-2] !== '\\') break; // string não terminada na linha
    }
    advance();
    lastSignificant = quote;
    continue;
  }
  if (c === '`') {
    advance();
    while (i < len && code[i] !== '`') {
      if (code[i] === '\\') { advance(2); continue; }
      if (code[i] === '$' && code[i+1] === '{') {
        advance(2);
        let depth = 1;
        while (i < len && depth > 0) {
          if (code[i] === '{') depth++;
          else if (code[i] === '}') depth--;
          if (depth > 0) advance();
        }
        advance();
        continue;
      }
      advance();
    }
    advance();
    lastSignificant = '`';
    continue;
  }
  // Regex literal - só se contexto permitir
  if (c === '/' && !regexNotAllowedAfter.test(lastSignificant)) {
    const startLine = line, startCol = col;
    let j = i + 1;
    let inClass = false;
    let ok = false;
    while (j < len) {
      if (code[j] === '\\') { j += 2; continue; }
      if (code[j] === '[') inClass = true;
      else if (code[j] === ']') inClass = false;
      else if (code[j] === '/' && !inClass) { ok = true; break; }
      else if (code[j] === '\n') break;
      j++;
    }
    if (ok) {
      // consumir flags
      j++;
      while (j < len && /[a-z]/i.test(code[j])) j++;
      const consumed = j - i;
      advance(consumed);
      lastSignificant = '/';
      continue;
    }
    // não é regex válido, trata como divisão normal (cai pro default abaixo)
  }

  if (c === '{' || c === '(' || c === '[') {
    stack.push({ c, line, col });
    lastSignificant = c;
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
    lastSignificant = c;
    advance();
    continue;
  }

  if (!/\s/.test(c)) lastSignificant = c;
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
