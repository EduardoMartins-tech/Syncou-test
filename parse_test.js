import fs from 'fs';
import { parse } from '@babel/parser';
const code = fs.readFileSync('server.ts', 'utf8');

try {
  parse(code, {
    sourceType: 'module',
    plugins: ['typescript']
  });
  console.log("No syntax errors found by Babel.");
} catch (e) {
  console.log(e);
}
