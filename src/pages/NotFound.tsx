import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center overflow-hidden relative">
      {/* Visual background lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center max-w-md">
        <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-purple-600 mb-2 drop-shadow-sm selection:bg-purple-500/30">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-4 selection:bg-purple-500/30">
          Ops! Página não encontrada.
        </h2>
        <p className="text-slate-400 text-base md:text-lg mb-8 leading-relaxed selection:bg-purple-500/30">
          Parece que você se perdeu no espaço. O link que você tentou acessar pode estar quebrado ou a página não existe mais.
        </p>
        <Link to="/" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.2)] hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all">
            <Home className="w-5 h-5 mr-3" />
            Voltar para o Início
          </Button>
        </Link>
      </div>
    </div>
  );
}
