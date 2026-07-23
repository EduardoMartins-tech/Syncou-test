import fs from 'fs';
const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

// replace all "startServer();" followed by any amount of whitespace and "});"
code = code.replace(/startServer\(\);[\s\S]*\}\);[\s\S]*/, 'startServer();\n');
fs.writeFileSync(serverFile, code);
