import { useState, useEffect, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, ExternalLink, RefreshCw, Upload, User, Plus, Trash2, CalendarX2, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { googleSignInForCalendar } from '../lib/firebase';

const slugSchema = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens").max(60),
  displayName: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().optional().or(z.literal('')),
  workingHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use formato HH:MM (ex: 09:00)"),
  workingHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use formato HH:MM (ex: 18:00)"),
  workingDays: z.array(z.number()),
  whatsapp: z.string().optional(),
});

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

type SettingsForm = z.infer<typeof slugSchema>;

export function DashboardSettings() {
  const { currentUser, getAuthHeaders, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentSlug, setCurrentSlug] = useState('');
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, { start: string; end: string; isClosed: boolean }>>({});
  
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('18:00');
  const [overrideIsClosed, setOverrideIsClosed] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  const handleConnectGoogleCalendar = async () => {
    try {
      const result = await googleSignInForCalendar();
      if (result?.accessToken) {
         // Save the token to backend
         await fetch('/api/users/google-token', {
           method: 'POST',
           headers: {
             ...getAuthHeaders(),
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ token: result.accessToken }),
         });
         setGoogleCalendarConnected(true);
         toast.success("Google Agenda conectado com sucesso!");
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
         toast.error("Falha ao conectar Google Agenda.");
      }
    }
  };

  const handleTestGoogleCalendar = async () => {
    try {
      const loadingToast = toast.loading("Enviando evento de teste...");
      const res = await fetch('/api/users/test-calendar', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      toast.dismiss(loadingToast);
      
      if (res.ok) {
        toast.success("✅ Evento de teste criado! Verifique seu Google Calendar.");
      } else {
        const errorData = await res.json();
        toast.error(`❌ Erro ao sincronizar: ${errorData.error}`);
      }
    } catch (err) {
      toast.error("Erro interno ao testar conexão.");
    }
  };

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<SettingsForm>({
    resolver: zodResolver(slugSchema),
    defaultValues: {
      slug: '',
      displayName: '',
      bio: '',
      avatarUrl: '',
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      workingDays: [1, 2, 3, 4, 5],
      whatsapp: '',
    }
  });

  const avatarUrl = watch('avatarUrl');
  const watchedDisplayName = watch('displayName');
  const watchedBio = watch('bio');
  const watchedSlug = watch('slug');

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem não pode ter mais que 2MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setValue('avatarUrl', dataUrl, { shouldDirty: true, shouldValidate: true });
          } else {
             toast.error("Erro ao processar imagem.");
          }
          setUploading(false);
        };
        img.onerror = () => {
          toast.error("Erro ao carregar a imagem.");
          setUploading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro no upload', err);
      toast.error('Falha ao processar a imagem');
      setUploading(false);
    }
  };

  useEffect(() => {
     if (currentUser) {
        console.log("currentUser from server:", currentUser);
        setCurrentSlug(currentUser.slug || '');
        setScheduleOverrides(currentUser.scheduleOverrides || {});
        
        if (currentUser.googleAccessToken) {
           setGoogleCalendarConnected(true);
        }
        
        let parsedWorkingDays = [1, 2, 3, 4, 5];
        if (Array.isArray(currentUser.workingDays)) {
           parsedWorkingDays = currentUser.workingDays.map(Number);
        } else if (typeof currentUser.workingDays === 'string') {
           try {
              parsedWorkingDays = JSON.parse(currentUser.workingDays).map(Number);
           } catch(e) {}
        }

        reset({
          slug: currentUser.slug || '',
          displayName: currentUser.displayName || '',
          bio: currentUser.bio || '',
          avatarUrl: currentUser.avatarUrl || '',
          workingHoursStart: currentUser.workingHoursStart || '09:00',
          workingHoursEnd: currentUser.workingHoursEnd || '18:00',
          workingDays: parsedWorkingDays,
          whatsapp: currentUser.whatsapp || '',
        });
     }
  }, [currentUser, reset]);

  const onSubmit = async (data: SettingsForm) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const cleanWhatsapp = data.whatsapp ? data.whatsapp.replace(/\D/g, '') : '';
      const payload = {
        slug: data.slug,
        displayName: data.displayName,
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || '',
        workingHoursStart: data.workingHoursStart,
        workingHoursEnd: data.workingHoursEnd,
        workingDays: JSON.stringify(data.workingDays),
        whatsapp: cleanWhatsapp,
      };

      await updateUser(payload);
      setCurrentSlug(data.slug);
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      console.error("Erro real ao salvar:", err);
      toast.error(err.message || "Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOverride = async () => {
    if (!currentUser || !overrideDate) return;
    setSavingOverride(true);
    
    try {
      const newOverrides = {
        ...scheduleOverrides,
        [overrideDate]: {
          start: overrideStart,
          end: overrideEnd,
          isClosed: overrideIsClosed
        }
      };
      
      await updateUser({ scheduleOverrides: newOverrides });
      setScheduleOverrides(newOverrides);
      toast.success("Exceção adicionada com sucesso!");
      
      // Reset form
      setOverrideDate('');
      setOverrideIsClosed(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar exceção.");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleRemoveOverride = async (dateKey: string) => {
    if (!currentUser) return;
    try {
      const newOverrides = { ...scheduleOverrides };
      delete newOverrides[dateKey];
      
      await updateUser({ scheduleOverrides: newOverrides });
      setScheduleOverrides(newOverrides);
      toast.success("Exceção removida com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover exceção.");
    }
  };

  const domain = window.location.origin;
  const publicUrl = `${domain}/p/${currentSlug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="xl:col-span-2 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Minha Página</h1>
          <p className="text-slate-400">Gerencie seu perfil público e seu link de agendamento.</p>
        </div>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100">Seu Link Público</CardTitle>
            <CardDescription className="text-slate-400">
              Este é o link que você compartilhará com seus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <div className="flex-1 font-mono text-slate-300 text-sm sm:text-base break-all">
                syncou.app/<span className="text-purple-400 font-bold">{currentSlug || 'sua-slug-aqui'}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 <Button onClick={copyLink} variant="secondary" className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-100">
                   <Copy className="w-4 h-4 mr-2" />
                   Copiar
                 </Button>
                 <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium h-9 px-4 py-2">
                   <ExternalLink className="w-4 h-4 mr-2" />
                   Ver
                 </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* INFORMAÇÕES PESSOAIS E DE CONTATO */}
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl text-slate-100">Informações Básicas</CardTitle>
              <CardDescription className="text-slate-400">
                Personalize como os clientes verão você em sua página de agendamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-slate-300">Identificador URL (Slug)</Label>
                <div className="flex bg-slate-950 rounded-md border border-slate-800 focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-transparent overflow-hidden">
                  <span className="flex items-center px-3 bg-slate-900 text-slate-500 border-r border-slate-800 text-sm">
                    syncou.app/
                  </span>
                  <input
                    id="slug"
                    {...register('slug')}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                    placeholder="seu-nome"
                  />
                </div>
                {errors.slug && <p className="text-red-400 text-sm">{errors.slug.message}</p>}
                <p className="text-xs text-slate-500">Apenas letras minúsculas, números e hífens.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-slate-300">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                  className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-purple-600"
                />
                {errors.displayName && <p className="text-red-400 text-sm">{errors.displayName.message}</p>}
              </div>

              <div className="space-y-4">
                <Label className="text-slate-300">Foto de Perfil</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <Avatar className="w-20 h-20 border-2 border-slate-800">
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-400">
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="avatar-upload"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button
                       type="button"
                       variant="outline"
                       className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                       disabled={uploading}
                       onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      {uploading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploading ? "Carregando..." : "Alterar Foto"}
                    </Button>
                    <p className="text-xs text-slate-500">PNG, JPG ou WebP (máx. 2MB)</p>
                  </div>
                </div>
                <input type="hidden" {...register('avatarUrl')} />
                {errors.avatarUrl && <p className="text-red-400 text-sm">{errors.avatarUrl.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-slate-300">Bio / Descrição</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-purple-600 min-h-[100px]"
                  placeholder="Conte um pouco sobre você, sua formação ou seus serviços..."
                />
                {errors.bio && <p className="text-red-400 text-sm">{errors.bio.message}</p>}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/50 mt-4">
                <h4 className="text-sm font-semibold tracking-wide text-slate-200 mb-4">Contato Direto (Opcional)</h4>
                <Label htmlFor="whatsapp" className="text-slate-300">Número de WhatsApp</Label>
                <Input
                  id="whatsapp"
                  {...register('whatsapp')}
                  className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-purple-600"
                  placeholder="Ex: 5511999999999"
                />
                <p className="text-xs text-slate-500">Adicione o DDI e DDD (ex: 5511999999999) para que clientes possam enviar mensagens.</p>
                {errors.whatsapp && <p className="text-red-400 text-sm">{errors.whatsapp.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* HORÁRIOS PADRÃO */}
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl text-slate-100">Disponibilidade Padrão</CardTitle>
              <CardDescription className="text-slate-400">
                Configure os dias úteis e a janela geral de horários em que você aceita agendamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart" className="text-slate-300">Horário de Início</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    {...register('workingHoursStart')}
                    className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-purple-600 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                  {errors.workingHoursStart && <p className="text-red-400 text-sm">{errors.workingHoursStart.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd" className="text-slate-300">Horário de Fim</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    {...register('workingHoursEnd')}
                    className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-purple-600 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                  {errors.workingHoursEnd && <p className="text-red-400 text-sm">{errors.workingHoursEnd.message}</p>}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                 <Label className="text-slate-300">Dias de Funcionamento</Label>
                 <div className="flex flex-wrap gap-2">
                   {DAYS_OF_WEEK.map(day => {
                     const rawWorkingDays = watch('workingDays') || [];
                     const workingDays = Array.isArray(rawWorkingDays) ? rawWorkingDays.map(Number) : [];
                     const isSelected = workingDays.includes(day.value);
                     return (
                       <button
                         key={day.value}
                         type="button"
                         onClick={() => {
                           const currentDays = workingDays;
                           let newDays;
                           if (isSelected) {
                             newDays = currentDays.filter((d: number) => d !== day.value);
                           } else {
                             newDays = [...currentDays, day.value].sort((a, b) => a - b);
                           }
                           setValue('workingDays', newDays, { shouldDirty: true, shouldValidate: true });
                         }}
                         className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-all ${
                           isSelected 
                             ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                             : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-purple-500/50 hover:text-slate-200'
                         }`}
                       >
                         {day.label}
                       </button>
                     );
                   })}
                 </div>
                 {errors.workingDays && <p className="text-red-400 text-sm">{errors.workingDays.message}</p>}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 sticky bottom-4 z-10 shadow-2xl shadow-black/80">
             <div className="text-sm text-slate-400">
                Lembre-se de salvar suas alterações para atualizar a página pública.
             </div>
             <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]">
               {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Salvar Alterações"}
             </Button>
          </div>
        </form>

        {/* Horários Especiais / Exceções */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
              <CalendarX2 className="w-5 h-5 text-purple-400" />
              Horários Especiais
            </CardTitle>
            <CardDescription className="text-slate-400">
              Adicione exceções para dias específicos em que você fará outro horário ou não trabalhará (férias, feriados).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <div className="space-y-2 w-full md:w-auto">
                <Label htmlFor="overrideDate" className="text-slate-300">Data *</Label>
                <Input
                  id="overrideDate"
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 focus-visible:ring-purple-600 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert min-w-[150px]"
                />
              </div>
              
              {!overrideIsClosed && (
                <>
                  <div className="space-y-2 w-full md:w-auto">
                    <Label htmlFor="overrideStart" className="text-slate-300">Início</Label>
                    <Input
                      id="overrideStart"
                      type="time"
                      value={overrideStart}
                      onChange={(e) => setOverrideStart(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-slate-100 focus-visible:ring-purple-600 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-auto">
                    <Label htmlFor="overrideEnd" className="text-slate-300">Fim</Label>
                    <Input
                      id="overrideEnd"
                      type="time"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-slate-100 focus-visible:ring-purple-600 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 mb-2 w-full md:w-auto">
                <input 
                  type="checkbox" 
                  id="overrideIsClosed"
                  checked={overrideIsClosed}
                  onChange={(e) => setOverrideIsClosed(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-600 focus:ring-offset-slate-950"
                />
                <Label htmlFor="overrideIsClosed" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Não trabalharei
                </Label>
              </div>

              <Button 
                type="button" 
                onClick={handleAddOverride} 
                disabled={savingOverride || !overrideDate} 
                className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white"
              >
                {savingOverride ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </div>

            {Object.keys(scheduleOverrides).length > 0 ? (
              <div className="space-y-3">
                <Label className="text-slate-300 text-sm font-semibold uppercase tracking-wider">Exceções Cadastradas</Label>
                <div className="grid gap-3">
                  {Object.entries(scheduleOverrides).sort((a,b) => a[0].localeCompare(b[0])).map(([dateKey, override]: readonly [string, any]) => {
                    const [year, month, day] = dateKey.split('-');
                    const formattedDate = `${day}/${month}/${year}`;
                    
                    return (
                      <div key={dateKey} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                        <div>
                          <p className="font-bold text-slate-100">{formattedDate}</p>
                          <p className="text-sm text-slate-400">
                            {override.isClosed 
                              ? <span className="text-red-400 font-medium">Dia Fechado</span>
                              : <span>Aberto das {override.start} às {override.end}</span>
                            }
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveOverride(dateKey)}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
               <div className="text-center py-6 text-slate-500 text-sm border border-slate-800 border-dashed rounded-xl">
                 Nenhuma exceção cadastrada.
               </div>
            )}
          </CardContent>
        </Card>

        {/* INTEGRATIONS SETTINGS */}
        <Card className="bg-slate-900/40 border-slate-800 shadow-sm mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
               <CalendarIcon className="w-5 h-5 text-purple-400" />
               Integrações
            </CardTitle>
            <CardDescription className="text-slate-400">
              Conecte sua conta do Google Calendar para sincronizar agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
               <div>
                  <h4 className="font-medium text-slate-200 mb-1">Google Calendar</h4>
                  <p className="text-sm text-slate-500">Agende e sincronize eventos automaticamente.</p>
               </div>
               <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                 {googleCalendarConnected && (
                   <Button
                     type="button"
                     variant="outline"
                     onClick={handleTestGoogleCalendar}
                     className="bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800 transition-all font-semibold shadow-sm"
                   >
                     Testar Sincronização (F5)
                   </Button>
                 )}
                 <Button
                   type="button"
                   onClick={handleConnectGoogleCalendar}
                   disabled={googleCalendarConnected}
                   className={`${googleCalendarConnected ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-default' : 'bg-white text-slate-900 hover:bg-slate-200'} transition-all font-semibold shadow-sm`}
                 >
                   {googleCalendarConnected ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Conectado</>
                   ) : (
                      <><CalendarIcon className="w-4 h-4 mr-2" /> Conectar</>
                   )}
                 </Button>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* LIVE PREVIEW COLUMN */}
      <div className="hidden xl:block">
        <div className="sticky top-6">
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="h-28 bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-blue-600/30 relative">
               <div className="absolute inset-0 bg-slate-900/20" />
            </div>
            <CardContent className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 border-4 border-slate-900 bg-slate-800 -mt-12 mb-4 shadow-xl">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-slate-800 text-slate-400 text-2xl font-bold">
                  {watchedDisplayName?.charAt(0) || <User className="w-10 h-10" />}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="text-xl font-bold text-white mb-1">{watchedDisplayName || 'Seu Nome Aqui'}</h3>
              <p className="text-sm font-medium text-purple-400 mb-4 bg-purple-400/10 px-3 py-1 rounded-full">
                syncou.app/{watchedSlug || 'seu-link'}
              </p>
              
              {watchedBio ? (
                <p className="text-sm text-slate-300 leading-relaxed max-w-[250px] whitespace-pre-wrap">
                  {watchedBio}
                </p>
              ) : (
                <div className="space-y-2 w-full mt-2 opacity-50">
                  <div className="h-2 w-full bg-slate-800 rounded mx-auto" />
                  <div className="h-2 w-5/6 bg-slate-800 rounded mx-auto" />
                  <div className="h-2 w-4/6 bg-slate-800 rounded mx-auto" />
                </div>
              )}
              
              <div className="mt-8 border-t border-slate-800/50 pt-6 w-full flex flex-col items-center justify-center space-y-4">
                 <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Prévia do Perfil</div>
                 <Button disabled variant="outline" className="w-full max-w-[200px] border-slate-700 bg-slate-800 text-slate-400">
                    Agendar Horário
                 </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
