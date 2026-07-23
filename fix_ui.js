import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Fix action buttons layout
const oldActionButtons = `<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {currentSlug && (
             <Button className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20" onClick={() => window.open(\`/p/\${currentSlug}\`, '_blank')}>
               <Plus className="w-4 h-4 mr-2" />
               Agendar Agora
             </Button>
          )}
          <Button variant="outline" className="w-full sm:w-auto bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white" onClick={() => handleSyncCalendar(false)} title="Sincroniza seus agendamentos para o seu Google Calendar. Útil caso algum agendamento tenha falhado.">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Sincronizar
          </Button>
          {currentSlug && (
             <Button variant="outline" className="w-full sm:w-auto bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white" onClick={() => {
                navigator.clipboard.writeText(\`\${window.location.origin}/p/\${currentSlug}\`);
                notifySuccess("Link copiado!");
             }}>
               <ExternalLink className="w-4 h-4 mr-2" />
               Copiar
             </Button>
          )}
        </div>`;

const newActionButtons = `<div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          {currentSlug && (
             <Button className="col-span-2 sm:col-span-1 w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20" onClick={() => window.open(\`/p/\${currentSlug}\`, '_blank')}>
               <Plus className="w-4 h-4 mr-2" />
               Agendar Agora
             </Button>
          )}
          <Button variant="outline" className="col-span-1 w-full bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white px-2" onClick={() => handleSyncCalendar(false)} title="Sincroniza seus agendamentos para o seu Google Calendar. Útil caso algum agendamento tenha falhado.">
            <RefreshCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Sincronizar</span>
            <span className="sm:hidden ml-1">Sincronizar</span>
          </Button>
          {currentSlug && (
             <Button variant="outline" className="col-span-1 w-full bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white px-2" onClick={() => {
                navigator.clipboard.writeText(\`\${window.location.origin}/p/\${currentSlug}\`);
                notifySuccess("Link copiado!");
             }}>
               <ExternalLink className="w-4 h-4 sm:mr-2" />
               <span className="hidden sm:inline">Copiar Link</span>
               <span className="sm:hidden ml-1">Copiar</span>
             </Button>
          )}
        </div>`;

code = code.replace(oldActionButtons, newActionButtons);

// 2. Fix the Tabs min-width
code = code.replace(/flex-1 min-w-\[140px\] rounded-lg py-2\.5 text-sm font-medium transition-colors/g, 'flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-colors whitespace-nowrap');

// 3. Fix the Filter Tabs wrapping
const oldFilters = `<div className="flex flex-wrap gap-2 pb-2">`;
const newFilters = `<div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 snap-x">`;
code = code.replace(oldFilters, newFilters);

// 4. Update the "Todos 13" chip
const oldChipClass = `className={\`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 \${
                     filterStatus === status 
                       ? 'bg-violet-600 text-white shadow-sm' 
                       : 'bg-[#130E20] border border-[#2D214F] text-[#9B8FC0] hover:text-white hover:border-[#4B3B7A]'
                   }\`}`;

const newChipClass = `className={\`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 snap-start \${
                     filterStatus === status 
                       ? 'bg-[#2D214F] text-white shadow-sm border border-[#4B3B7A]' 
                       : 'bg-[#130E20] border border-[#2D214F] text-[#9B8FC0] hover:text-white hover:border-[#4B3B7A]'
                   }\`}`;

code = code.replace(oldChipClass, newChipClass);

fs.writeFileSync(file, code);
console.log("UI updated.");
