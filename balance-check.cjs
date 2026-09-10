const fs = require('fs');
const src = fs.readFileSync('./public/widget.js', 'utf8');
let depth = 0, line = 1, i = 0, state = 'code', q = '';
const log = [];
while (i < src.length) {
  const c = src[i], n = src[i+1];
  if (state === 'lineComment') { if (c === '\n') state = 'code'; }
  else if (state === 'blockComment') { if (c === '*' && n === '/') { state = 'code'; i++; } }
  else if (state === 'string') { if (c === '\\') i++; else if (c === q) state = 'code'; }
  else if (state === 'template') { if (c === '\\') i++; else if (c === '`') state = 'code'; }
  else {
    if (c === '/' && n === '/') { state = 'lineComment'; i++; }
    else if (c === '/' && n === '*') { state = 'blockComment'; i++; }
    else if (c === '"' || c === "'") { state = 'string'; q = c; }
    else if (c === '`') { state = 'template'; }
    else if (c === '(') { depth++; if (line >= 6700) log.push(`L${line} ( -> ${depth}`); }
    else if (c === ')') { depth--; if (line >= 6700) log.push(`L${line} ) -> ${depth}`); if (depth < 0) { console.log(`EXTRA ) na linha ${line}`); process.exit(0); } }
  }
  if (c === '\n') line++;
  i++;
}
console.log(`Depth final: ${depth}`);
console.log(log.join('\n'));
