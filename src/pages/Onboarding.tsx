import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

const onboardingSchema = z.object({
  displayName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100, "O nome pode ter no máximo 100 caracteres"),
  whatsapp: z.string().min(10, "Digite um número de WhatsApp válido").max(20, "O número de WhatsApp é muito longo"),
  slug: z.string()
    .min(3, "O link deve ter pelo menos 3 caracteres")
    .max(60, "O link pode ter no máximo 60 caracteres")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export function Onboarding() {
  const navigate = useNavigate();
  const { currentUser, loading, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  // States for real-time slug checking
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: '',
      whatsapp: '',
      slug: '',
    }
  });

  const slugValue = watch('slug');

  // Verify Auth State
  useEffect(() => {
    if (loading) return;
    
    if (currentUser) {
      setValue('displayName', currentUser.displayName || '');
      if (currentUser.displayName && !slugValue) {
        const generatedSlug = currentUser.displayName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 30);
        setValue('slug', generatedSlug);
      }
    }
  }, [currentUser, loading, setValue]);

  // Real-time Slug Checking via API
  useEffect(() => {
    if (!slugValue || slugValue.length < 3) {
      setSlugAvailable(null);
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slugValue)) {
      setSlugAvailable(false);
      return;
    }

    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/provider/${slugValue}`);
        if (res.status === 404) {
          // 404 means it's available
          setSlugAvailable(true);
        } else if (res.ok) {
          const provider = await res.json();
          if (provider.id === currentUser?.id) {
            setSlugAvailable(true); // already ours
          } else {
            setSlugAvailable(false);
          }
        }
      } catch (err: any) {
        setSlugAvailable(true); // assume true on network err
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slugValue, currentUser]);

  const onSubmit = async (data: OnboardingForm) => {
    if (!currentUser) return;

    if (slugAvailable === false) {
      toast.error("Este link personalizado já está em uso por outro profissional.");
      return;
    }

    setSaving(true);
    try {
      const cleanWhatsapp = data.whatsapp.replace(/\D/g, '');
      
      const success = await updateUser({
        slug: data.slug,
        displayName: data.displayName,
        whatsapp: cleanWhatsapp,
      });

      if (success) {
        toast.success("Perfil criado com sucesso!");
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error("Ocorreu um erro ao salvar suas informações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Logo className="w-16 h-16 drop-shadow-[0_0_15px_rgba(147,51,234,0.5)] mb-4" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-xl relative z-10"
      >
        <Card className="border border-slate-850 bg-slate-900/80 backdrop-blur-md shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex items-center justify-center mb-4">
              <Logo className="w-16 h-16 drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
              Seja bem-vindo ao Syncou!
            </CardTitle>
            <CardDescription className="text-slate-400 max-w-sm mx-auto">
              Complete seu perfil profissional para começar a receber agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-slate-300 font-medium text-sm">
                  Nome do Profissional ou Negócio
                </Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                  placeholder="Seu Nome Completo"
                  className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-purple-600 focus:border-purple-600"
                />
                {errors.displayName && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-slate-300 font-medium text-sm">
                  Seu WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  {...register('whatsapp')}
                  placeholder="Ex: 5511999999999"
                  className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-purple-600 focus:border-purple-600"
                />
                <p className="text-[11px] text-slate-500">
                  DDI + DDD + Número (apenas dígitos). Exemplo: 5511999999999.
                </p>
                {errors.whatsapp && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.whatsapp.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-slate-300 font-medium text-sm">
                  Link Personalizado da sua Agenda
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 text-sm select-none font-medium">
                    syncou.app/p/
                  </span>
                  <Input
                    id="slug"
                    {...register('slug')}
                    placeholder="seu-nome"
                    className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-purple-600 focus:border-purple-600 pl-[100px]"
                  />
                </div>

                {slugValue && slugValue.length >= 3 && (
                  <div className="flex items-center gap-2 mt-1.5 transition-all text-xs">
                    {checkingSlug ? (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                        Verificando link...
                      </span>
                    ) : slugAvailable ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Disponível!
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1 font-medium bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Em uso por outro profissional.
                      </span>
                    )}
                  </div>
                )}
                {errors.slug && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.slug.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={saving || checkingSlug || slugAvailable === false}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all shadow-md rounded-lg flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Concluir e Ir ao Painel"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
