const fs = require('fs');
const s = fs.readFileSync('public/widget.js', 'utf8');
const stack = [];
const open = { '(': ')', '[': ']', '{': '}' };
const close = { ')': '(', ']': '[', '}': '{' };
let line = 1, col = 1;
let inStr = null, inLineCmt = false, inBlockCmt = false, esc = false;

for (let i = 0; i < s.length; i++) {
  const c = s[i];
  const next = i + 1 < s.length ? s[i + 1] : '';

  if (c === '\n') { line++; col = 1; continue; }

  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === inStr) inStr = null;
    col++; continue;
  }

  if (inLineCmt) { if (c === '\n') inLineCmt = false; col++; continue; }
  if (inBlockCmt) { if (c === '*' && next === '/') { inBlockCmt = false; i++; col += 2; continue; } col++; continue; }

  if (c === '/' && next === '/') { inLineCmt = true; i++; col += 2; continue; }
  if (c === '/' && next === '*') { inBlockCmt = true; i++; col += 2; continue; }

  if (c === '"' || c === "'" || c === '`') { inStr = c; col++; continue; }

  if (open[c]) { stack.push({ c, line, col }); }
  else if (close[c]) {
    if (stack.length === 0) { console.log("EXCESS '" + c + "' at " + line + ':' + col); process.exit(1); }
    const top = stack.pop();
    if (top.c !== close[c]) { console.log("MISMATCH: opened '" + top.c + "' at " + top.line + ':' + top.col + ", closed by '" + c + "' at " + line + ':' + col); process.exit(1); }
  }
  col++;
}

console.log('Remaining unclosed (' + stack.length + '):');
for (let i = stack.length - 1; i >= 0; i--) {
  console.log("  '" + stack[i].c + "' opened at " + stack[i].line + ':' + stack[i].col);
}
