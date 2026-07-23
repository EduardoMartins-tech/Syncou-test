import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

for (let i = lines.length - 30; i < lines.length; i++) {
  console.log(i + ": " + lines[i]);
}
