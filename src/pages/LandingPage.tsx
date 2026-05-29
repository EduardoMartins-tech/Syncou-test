import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Share2, CalendarDays, Settings, Mail, Lock, Loader2, XCircle, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { toast } from 'sonner';
import { googleSignInBasic } from '../lib/firebase';
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
  const { currentUser, login, register, loginWithGoogle } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isValidPassword = hasMinLength && hasUppercase && hasNumber && hasSpecialChar;

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    try {
      const result = await googleSignInBasic();
      if (result) {
        const { user } = result;
        const success = await loginWithGoogle(
          user.email || '',
          user.displayName || ''
        );
        if (success) {
          toast.success('Login efetuado com sucesso!');
          setIsAuthModalOpen(false);
        }
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Erro ao fazer login com o Google.');
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

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
        if (authStep === 'form') {
          const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail })
          });
          const data = await res.json();
          if (res.ok) {
            toast.success('Código enviado! Verifique seu e-mail (ou o console).');
            setAuthStep('otp');
          } else {
            toast.error(data.error || 'Erro ao enviar código.');
          }
        } else {
          if (!otpCode) {
            toast.error('Preencha o código.');
            return;
          }
          const success = await register(cleanEmail, password, otpCode);
          if (success) {
            toast.success('Conta criada com sucesso!');
            setIsAuthModalOpen(false);
          }
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
    setAuthStep('form');
    setEmail('');
    setPassword('');
    setOtpCode('');
    setIsAuthModalOpen(true);
  };


  return (
    <div className="min-h-screen bg-[#0B0914] text-[#E2D9F3] font-sans selection:bg-violet-500/30">
      <header className="fixed top-0 w-full bg-[#0B0914]/80 backdrop-blur-md border-b border-[#2D214F] z-50 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
            <span className="font-semibold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium" onClick={() => openAuthModal('login')}>Log in</Button>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] font-medium rounded-lg" onClick={() => openAuthModal('register')}>
              Criar minha conta
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-16 px-4 overflow-hidden">
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto text-center mb-24"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-white leading-[1.1]">
            Agendamentos,<br />
            <span className="text-violet-400">sem atrito.</span>
          </h1>
          <p className="text-xl text-[#9B8FC0] mb-10 max-w-2xl mx-auto font-normal leading-relaxed">
            A plataforma com o design mais elegante do mercado para prestadores de serviço. 
            Crie sua página pública e deixe seus clientes agendarem automaticamente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white w-full sm:w-auto text-lg h-14 px-8 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.25)] font-medium transition-all" onClick={() => openAuthModal('register')}>
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5 pointer-events-none opacity-80" />
            </Button>
          </div>
        </motion.section>

        <section className="max-w-5xl mx-auto py-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-semibold text-center mb-16 text-white tracking-tight"
          >
            Como funciona
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="border border-[#2D214F] bg-[#130E20] shadow-sm h-full">
                <CardContent className="pt-8 text-center p-8">
                  <div className="w-16 h-16 bg-[#1A1333] border border-[#2D214F] rounded-xl flex items-center justify-center mx-auto mb-6 text-violet-400 shadow-sm">
                    <Settings className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-medium mb-3 text-white tracking-tight">1. Configurar</h3>
                  <p className="text-[#9B8FC0] text-sm leading-relaxed">
                    Defina seu perfil, crie sua área personalizada e liste os serviços que você oferece com preços e durações.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="border border-[#2D214F] bg-[#130E20] shadow-sm h-full">
                <CardContent className="pt-8 text-center p-8">
                  <div className="w-16 h-16 bg-[#1A1333] border border-[#2D214F] rounded-xl flex items-center justify-center mx-auto mb-6 text-violet-400 shadow-sm">
                    <Share2 className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-medium mb-3 text-white tracking-tight">2. Compartilhar</h3>
                  <p className="text-[#9B8FC0] text-sm leading-relaxed">
                    Copie seu link único (syncou.app/seu-nome) e envie diretamente para seus clientes ou adicione no Instagram.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="border border-[#2D214F] bg-[#130E20] shadow-sm h-full">
                <CardContent className="pt-8 text-center p-8">
                  <div className="w-16 h-16 bg-[#1A1333] border border-[#2D214F] rounded-xl flex items-center justify-center mx-auto mb-6 text-violet-400 shadow-sm">
                    <CalendarDays className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-medium mb-3 text-white tracking-tight">3. Gerenciar</h3>
                  <p className="text-[#9B8FC0] text-sm leading-relaxed">
                    Receba agendamentos no seu dashboard, aprove e gerencie seu negócio em um painel elegante e calmo.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2D214F] py-12 bg-[#08060F] mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center text-[#9B8FC0] text-sm">
          <p>&copy; {new Date().getFullYear()} Syncou. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Auth Modal with Email/Password */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-[#130E20] border-[#2D214F] text-[#E2D9F3] p-8 shadow-2xl rounded-2xl">
          <>
            <DialogHeader className="space-y-2">
              <div className="mx-auto flex items-center justify-center mb-4">
                <Logo className="w-12 h-12 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
              </div>
              <DialogTitle className="text-2xl font-semibold text-center text-white tracking-tight">
                {authMode === 'login' 
                  ? 'Entrar no Syncou' 
                  : 'Crie sua conta' 
                }
              </DialogTitle>
              <DialogDescription className="text-center text-[#9B8FC0] text-sm">
                {authMode === 'login' 
                  ? 'Entre para gerenciar seus agendamentos' 
                  : 'Comece a receber agendamentos de forma elegante' 
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 p-1 bg-[#0A0713] rounded-lg my-6 border border-[#2D214F]/50">
              <button
                onClick={() => setAuthMode('login')}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  authMode === 'login'
                    ? 'bg-[#2D214F] text-white shadow-sm'
                    : 'text-[#9B8FC0] hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  authMode === 'register'
                    ? 'bg-[#2D214F] text-white shadow-sm'
                    : 'text-[#9B8FC0] hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            <div className="space-y-5">
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                {authMode === 'register' && authStep === 'otp' ? (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4">
                    <Label htmlFor="auth-otp" className="text-xs font-semibold uppercase tracking-wider text-[#9B8FC0]">
                      Código de Verificação
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6FA4]" />
                      <Input
                        id="auth-otp"
                        type="text"
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Ex: 123456"
                        className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] placeholder:text-[#5B4F81] pl-10 focus-visible:ring-violet-500 h-11 rounded-lg shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-[#9B8FC0] mt-2">Enviamos um código para {email}.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-email" className="text-xs font-semibold uppercase tracking-wider text-[#9B8FC0]">
                        E-mail
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6FA4]" />
                        <Input
                          id="auth-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@exemplo.com"
                          className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] placeholder:text-[#5B4F81] pl-10 focus-visible:ring-violet-500 h-11 rounded-lg shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auth-password" className="text-xs font-semibold uppercase tracking-wider text-[#9B8FC0]">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6FA4]" />
                        <Input
                          id="auth-password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={authMode === 'register' ? "Mínimo 6 caracteres" : "Sua senha"}
                          className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] placeholder:text-[#5B4F81] pl-10 focus-visible:ring-violet-500 h-11 rounded-lg shadow-sm"
                        />
                      </div>
                      
                      {authMode === 'register' && (
                        <div className="pt-2 space-y-1.5 flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2 text-xs">
                            {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasMinLength ? "text-emerald-400" : "text-[#5B4F81]"}>Mínimo de 6 caracteres</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasUppercase ? "text-emerald-400" : "text-[#5B4F81]"}>1 letra maiúscula</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasNumber ? "text-emerald-400" : "text-[#5B4F81]"}>1 número</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasSpecialChar ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasSpecialChar ? "text-emerald-400" : "text-[#5B4F81]"}>1 caractere especial</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || (authMode === 'register' && authStep === 'form' && !isValidPassword)}
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium h-11 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : authMode === 'login' ? (
                    'Entrar'
                  ) : authStep === 'otp' ? (
                    'Confirmar e Criar Conta'
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </form>

              {authStep === 'form' && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#2D214F]"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#130E20] px-3 text-[#5B4F81] uppercase tracking-widest font-medium">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isGoogleSubmitting}
                    onClick={handleGoogleSignIn}
                    className="w-full border-[#2D214F] bg-[#1A1333] hover:bg-[#2D214F] text-[#E2D9F3] font-medium h-11 rounded-lg shadow-sm"
                  >
                    {isGoogleSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-zinc-500" />
                    ) : (
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continuar com Google
                  </Button>
                </>
              )}

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-[#9B8FC0] hover:text-white hover:underline decoration-[#5B4F81] underline-offset-4 transition-all"
                >
                  {authMode === 'login' 
                    ? 'Não tem uma conta? Comece aqui'
                    : 'Já possui cadastro? Acesse sua conta'
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
