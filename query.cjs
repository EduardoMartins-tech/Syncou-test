const db = require('better-sqlite3')('syncou.db');
const users = db.prepare('SELECT id, slug, display_name, working_days FROM users').all();
console.log(users);
