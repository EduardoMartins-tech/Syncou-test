import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldSort = `  }).sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());`;
const newSort = `  }).sort((a, b) => {
    const isAPending = a.status === 'scheduled' || a.status === 'Pendente' || !a.status;
    const isBPending = b.status === 'scheduled' || b.status === 'Pendente' || !b.status;
    
    if (isAPending && !isBPending) return -1;
    if (!isAPending && isBPending) return 1;

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.startAt;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.startAt;
    return bTime - aTime;
  });`;

if (code.includes(oldSort)) {
  code = code.replace(oldSort, newSort);
  fs.writeFileSync(file, code);
  console.log("Sort logic updated.");
} else {
  console.log("oldSort not found");
}
