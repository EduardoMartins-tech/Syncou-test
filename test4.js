import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

let depth = 0;
let lastDepth0Line = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for(let j=0; j<line.length; j++) {
     if (line[j] === '{') depth++;
     if (line[j] === '}') depth--;
  }
  if (depth === 0) {
      lastDepth0Line = i;
  }
}
console.log("Last line with depth 0 is:", lastDepth0Line);
console.log("Line after that is:", lines[lastDepth0Line + 1]);
