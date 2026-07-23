import fs from 'fs';
const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const strToFind = `  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`;

const strToReplace = `  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`; // wait, what's wrong? Let me just append } to the end of the file since it's missing 1 bracket, wait no, if it's app.post missing a bracket, the bracket belongs before });
