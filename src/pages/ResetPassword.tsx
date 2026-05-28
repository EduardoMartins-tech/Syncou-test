import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export function ResetPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-72 h-72 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-72 h-72 bg-purple-800/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative z-10 p-2 sm:p-4">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-950/40 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">
                Redefinição de Senha Desativada
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Nesta versão local de demonstração, a redefinição de senha está temporariamente desativada em virtude da ausência de um servidor de e-mail integrado.
              </p>
            </div>
            
            <div className="pt-4 flex flex-col gap-2">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
