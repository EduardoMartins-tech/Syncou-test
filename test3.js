import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for(let j=0; j<line.length; j++) {
     if (line[j] === '{') depth++;
     if (line[j] === '}') depth--;
  }
  if (line.includes('startServer();')) {
     console.log('Depth at startServer(); is', depth);
  }
}
