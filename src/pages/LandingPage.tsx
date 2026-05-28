import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Share2, CalendarDays, Settings, Mail, Lock, Loader2, XCircle, Check } from 'lucide-react';
import { Logo } from '../components/Logo';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { currentUser, login, register } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasMinLength = password.length >= 6;
  const isValidPassword = hasMinLength; 

  // Smart routing
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.slug) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [currentUser, navigate]);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }
    
    if (authMode === 'register' && !isValidPassword) {
      toast.error('Por favor, atenda a todos os critérios da senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        const success = await login(cleanEmail, password);
        if (success) {
          toast.success('Login efetuado com sucesso!');
          setIsAuthModalOpen(false);
        }
      } else {
        const success = await register(cleanEmail, password);
        if (success) {
          toast.success('Conta criada com sucesso!');
          setIsAuthModalOpen(false);
        }
      }
    } catch (error: any) {
      toast.error('Erro ao realizar autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setIsAuthModalOpen(true);
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
            <span className="font-bold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => openAuthModal('login')}>Log in</Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/10" onClick={() => openAuthModal('register')}>
              Criar minha conta
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-16 px-4">
        <section className="max-w-4xl mx-auto text-center mb-24 animate-in fade-in zoom-in-95 duration-700 delay-100">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-white leading-tight">
            Compartilhe seu link. <br />
            <span className="text-purple-600 text-transparent bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text">Receba agendamentos.</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-normal leading-relaxed">
            A plataforma definitiva para prestadores de serviço. 
            Crie sua página pública, escolha seus serviços e deixe seus clientes agendarem automaticamente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-lg shadow-purple-600/20 active:scale-95 transition-all" onClick={() => openAuthModal('register')}>
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5 pointer-events-none" />
            </Button>
          </div>
        </section>

        <section className="max-w-5xl mx-auto py-16">
          <h2 className="text-3xl font-extrabold text-center mb-16 text-white tracking-tight">Como funciona</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border border-slate-900 bg-slate-900/40 text-slate-100">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 bg-purple-900/30 border border-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-400">
                  <Settings className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">1. Configurar</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Defina seu perfil, crie sua slug personalizada e liste os serviços que você oferece com preços e durações.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-900 bg-slate-900/40 text-slate-100">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 bg-purple-900/30 border border-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-400">
                  <Share2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">2. Compartilhar</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Copie seu link único (syncou.app/p/seu-nome) e envie para seus clientes, ou coloque na bio do seu Instagram.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-900 bg-slate-900/40 text-slate-100">
              <CardContent className="pt-8 text-center">
                <div className="w-16 h-16 bg-purple-900/30 border border-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-400">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">3. Gerenciar</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Receba agendamentos no seu dashboard, aprove e gerencie tudo em um só lugar de forma simples e rápida.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-12 bg-slate-950 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} Syncou. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Auth Modal with Email/Password */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-slate-900 border-slate-800 text-slate-100 p-6 shadow-2xl">
          <>
            <DialogHeader className="space-y-1">
              <div className="mx-auto flex items-center justify-center mb-2">
                <Logo className="w-12 h-12 drop-shadow-[0_0_10px_rgba(147,51,234,0.4)]" />
              </div>
              <DialogTitle className="text-2xl font-black text-center text-white tracking-tight">
                {authMode === 'login' 
                  ? 'Entrar no Syncou' 
                  : 'Crie sua conta' 
                }
              </DialogTitle>
              <DialogDescription className="text-slate-405 text-center text-slate-400 text-sm">
                {authMode === 'login' 
                  ? 'Entre para gerenciar seus agendamentos' 
                  : 'Comece a receber agendamentos hoje mesmo' 
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-lg my-4">
              <button
                onClick={() => setAuthMode('login')}
                className={`py-2 text-sm font-semibold rounded-md transition-all ${
                  authMode === 'login'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`py-2 text-sm font-semibold rounded-md transition-all ${
                  authMode === 'register'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Criar Conta
              </button>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email" className="text-slate-350 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-650 pl-10 focus-visible:ring-purple-600 focus:border-purple-600 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auth-password" className="text-slate-350 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="auth-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={authMode === 'register' ? "Mínimo 6 caracteres" : "Sua senha"}
                      className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-650 pl-10 focus-visible:ring-purple-600 focus:border-purple-600 h-11"
                    />
                  </div>
                  
                  {authMode === 'register' && (
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        {hasMinLength ? <Check className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-500" />}
                        <span className={hasMinLength ? "text-slate-500" : "text-slate-300"}>Mínimo de 6 caracteres</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || (authMode === 'register' && !isValidPassword)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : authMode === 'login' ? (
                    'Entrar'
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition-all"
                >
                  {authMode === 'login' 
                    ? 'Não tem uma conta profissional? Increva-se agora!'
                    : 'Já possui cadastro? Faça o login na sua conta'
                  }
                </button>
              </div>
            </div>
          </>
        </DialogContent>
      </Dialog>
    </div>
  );
}
