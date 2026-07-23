import fs from 'fs';
const file = 'src/pages/DashboardSettings.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add to slugSchema
code = code.replace(/whatsappMessageTemplate: z\.string\(\)\.optional\(\),/g, "whatsappMessageTemplate: z.string().optional(),\n  avatarUrl: z.string().optional(),");

// 2. Add to defaultValues
code = code.replace(/whatsappMessageTemplate: '',/g, "whatsappMessageTemplate: '',\n      avatarUrl: '',");

// 3. Add to onSubmit payload
code = code.replace(/whatsappMessageTemplate: data\.whatsappMessageTemplate,/g, "whatsappMessageTemplate: data.whatsappMessageTemplate,\n        avatarUrl: data.avatarUrl,");

// 4. Update the reset in useEffect
code = code.replace(/whatsappMessageTemplate: currentUser\.whatsappMessageTemplate \|\| '',/g, "whatsappMessageTemplate: currentUser.whatsappMessageTemplate || '',\n          avatarUrl: currentUser.avatarUrl || '',");

fs.writeFileSync(file, code);
