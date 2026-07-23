import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
console.log(lines[1222]);
console.log(lines[1223]);
