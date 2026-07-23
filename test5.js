import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const oldDepth = depth;
  for(let j=0; j<line.length; j++) {
     if (line[j] === '{') depth++;
     if (line[j] === '}') depth--;
  }
  if (oldDepth === 0 && depth > 0) {
      console.log(`Block started at line ${i}: ${line}`);
  }
}
