import fs from 'fs';
const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /res\.status\(500\)\.json\(\{ error: error\.message \}\);\s*\}\s*\}\);/m;
const match = code.match(regex);
console.log(match ? "Found match" : "No match");
