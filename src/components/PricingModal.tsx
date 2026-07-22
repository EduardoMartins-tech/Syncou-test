import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Crown, CreditCard, Sparkles, 
  ArrowRight, ShieldCheck, RefreshCw, AlertCircle, Copy, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { currentUser, getAuthHeaders, refreshUser } = useAuth();
  const [tab, setTab] = useState<'plans' | 'checkout'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixTimer, setPixTimer] = useState(600); // 10 minutes in seconds

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    let interval: any;
    if (isOpen && tab === 'checkout' && paymentMethod === 'pix' && pixTimer > 0) {
      interval = setInterval(() => {
        setPixTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, tab, paymentMethod, pixTimer]);

  if (!isOpen) return null;

  const handleCopyPix = () => {
    navigator.clipboard.writeText("00020126580014BR.GOV.BCB.PIX0136syncou-charge-simulated-uuid-payment-id-code520400005303986540529.905802BR5915Syncou Payments6009Sao Paulo62070503***6304");
    setPixCopied(true);
    toast.success("Código Copiado! Copie e cole em seu App do Banco.");
    setTimeout(() => setPixCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    toast.info("Processando pagamento simulado...");
    
    // Simulate real transaction delay
    setTimeout(async () => {
      try {
        const res = await fetch('/api/subscription/upgrade', {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plan: 'gold' })
        });
        
        if (res.ok) {
          await refreshUser();
          toast.success("Parabéns! Sua assinatura Plano Ouro 👑 foi ativada com sucesso!");
          onClose();
        } else {
          const errData = await res.json();
          toast.error(errData.error || "Erro ao atualizar convênio do plano.");
        }
      } catch (err) {
        toast.error("Erro interno ao simular pagamento.");
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Tem certeza que deseja cancelar sua assinatura Ouro? Suas limitações voltarão ao Plano Bronze (Gratuito) imediatamente.")) {
      return;
    }
    
    setIsProcessing(true);
    toast.info("Cancelando assinatura...");
    
    try {
      const res = await fetch('/api/subscription/downgrade', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        await refreshUser();
        toast.success("Assinatura cancelada. Você retornou ao Plano Bronze.");
        setTab('plans');
      } else {
        toast.error("Erro ao cancelar assinatura.");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div id="pricing-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
        <motion.div
          id="pricing-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#2D214F] bg-[#130E20] text-[#E2D9F3] shadow-2xl"
        >
          {/* Header decoration */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500" />

          {/* Close button */}
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-[#9B8FC0] hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            {tab === 'plans' && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-3">
                    <Crown className="w-3.5 h-3.5" /> PLANOS & MONETIZAÇÃO
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Escolha o Plano Ideal para seu Negócio</h2>
                  <p className="text-sm text-[#9B8FC0] mt-1">Escale seus agendamentos, automatize processos e elimine burocracias.</p>
                </div>

                {/* Grid Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  
                  {/* Plano Bronze (Free) */}
                  <div className={`relative rounded-xl border p-5 ${
                    currentUser?.plan !== 'gold' 
                      ? 'border-violet-500/40 bg-[#1D1733] shadow-inner' 
                      : 'border-[#21193B] bg-[#0C0819]'
                  }`}>
                    {currentUser?.plan !== 'gold' && (
                      <span className="absolute top-3 right-3 text-[10px] bg-violet-600/30 text-violet-300 border border-violet-500/30 font-semibold px-2 py-0.5 rounded-full">
                        Ativo Atualmente
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-[#E2D9F3]">Plano Bronze</h3>
                    <p className="text-xs text-[#9B8FC0] mt-0.5">Para iniciantes no digital</p>
                    <div className="my-4">
                      <span className="text-3xl font-extrabold text-white">R$ 0</span>
                      <span className="text-sm text-[#9B8FC0]"> / sempre</span>
                    </div>

                    <div className="space-y-2.5 my-6 text-sm">
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                        <span>Apenas <strong>1 serviço</strong> ativo cadastrado</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                        <span>Máximo de <strong>15 agendamentos</strong> por mês</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-opacity-50 line-through text-[#9B8FC0]">
                        <X className="w-4 h-4 text-red-400/60 shrink-0 mt-0.5" />
                        <span>Notificação padrão de agendamentos</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-[#9B8FC0] line-through">
                        <X className="w-4 h-4 text-red-400/60 shrink-0 mt-0.5" />
                        <span>Sincronização com o Google Calendar</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-[#9B8FC0] line-through">
                        <X className="w-4 h-4 text-red-400/60 shrink-0 mt-0.5" />
                        <span>Customização no WhatsApp Template</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      disabled
                      className="w-full bg-[#130E20]/45 border-[#2D214F] text-[#9B8FC0]"
                    >
                      Plano Gratuito Ativo
                    </Button>
                  </div>

                  {/* Plano Ouro (Premium) */}
                  <div className={`relative rounded-xl border p-5 overflow-hidden ${
                    currentUser?.plan === 'gold' 
                      ? 'border-amber-500/40 bg-[#1D1733] shadow-inner' 
                      : 'border-amber-500/30 bg-[#241A41]'
                  }`}>
                    {currentUser?.plan === 'gold' && (
                      <span className="absolute top-3 right-3 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold px-2 py-0.5 rounded-full">
                        Ativo Atualmente 👑
                      </span>
                    )}
                    
                    {/* Golden glow decoration */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/20 blur-2xl rounded-full" />
                    
                    <h3 className="text-lg font-bold text-white flex items-center gap-1.5 text-amber-300">
                      Plano Ouro <Crown className="w-4 h-4 fill-amber-300 text-amber-300" />
                    </h3>
                    <p className="text-xs text-amber-100/70 mt-0.5">Especial para profissionais em crescimento</p>
                    <div className="my-4">
                      <span className="text-3xl font-extrabold text-white">R$ 29,90</span>
                      <span className="text-sm text-[#9B8FC0]"> / mês</span>
                    </div>

                    <div className="space-y-2.5 my-6 text-sm">
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Serviços ativos ILIMITADOS</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Agendamentos ILIMITADOS</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Sincronização instantânea com Google Calendar</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Configuração de Template Customizado do WhatsApp</strong></span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Suporte prioritário e painel avançado</span>
                      </div>
                    </div>

                    {currentUser?.plan === 'gold' ? (
                      <Button 
                        type="button"
                        onClick={handleCancelSubscription}
                        disabled={isProcessing}
                        className="w-full bg-[#130E20] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300 text-[#9B8FC0] border-[#2D214F] transition-colors"
                      >
                        {isProcessing ? 'Processando...' : 'Cancelar Assinatura'}
                      </Button>
                    ) : (
                      <Button 
                        type="button"
                        onClick={() => setTab('checkout')}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold border-none flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15"
                      >
                        Fazer Upgrade Agora <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                </div>

                <div className="text-center text-xs text-[#9B8FC0]">
                  🔒 Transações 100% seguras na infraestrutura Syncou Payments.
                </div>
              </div>
            )}

            {tab === 'checkout' && (
              <div>
                <button 
                  type="button"
                  onClick={() => setTab('plans')} 
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mb-4"
                >
                  &larr; Voltar para planos
                </button>

                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  Ambiente de Simulação de Pagamento
                </h2>
                <p className="text-xs text-[#9B8FC0] mb-6">
                  Nossa plataforma simula a ativação real de assinaturas. Escolha o teste abaixo, execute e comprove o desbloqueio instantâneo dos recursos Premium.
                </p>

                {/* Sub-tabs payment methods */}
                <div className="flex border-b border-[#2D214F] mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-1 px-4 border-b-2 transition-all ${
                      paymentMethod === 'pix' 
                        ? 'border-amber-400 text-white' 
                        : 'border-transparent text-[#9B8FC0] hover:text-[#E2D9F3]'
                    }`}
                  >
                    🚀 Pagar via PIX (Simulado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-1 px-4 border-b-2 transition-all ${
                      paymentMethod === 'card' 
                        ? 'border-amber-400 text-white' 
                        : 'border-transparent text-[#9B8FC0] hover:text-[#E2D9F3]'
                    }`}
                  >
                    💳 Cartão de Crédito (Simulado)
                  </button>
                </div>

                {paymentMethod === 'pix' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                      <div className="md:col-span-2 flex flex-col items-center p-3 bg-white rounded-lg border border-[#2D214F]">
                        {/* simulated QR code */}
                        <div className="w-36 h-36 bg-gray-100 flex items-center justify-center relative p-1 rounded">
                          <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100">
                            {/* Fake QR mesh */}
                            <path fill="currentColor" d="M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z M10,70 h20 v20 h-20 z M15,75 h10 v10 h-10 z M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z M40,40 h10 v10 h-10 z M55,55 h10 v10 h-10 z M45,75 h20 v5 h-20 z M75,45 h5 v20 h-5 z M50,15 h5 v15 h-5 z M70,80 h15 v5 h-15 z" />
                            <rect x="42" y="50" width="5" height="5" fill="currentColor" />
                            <rect x="62" y="30" width="10" height="5" fill="currentColor" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-amber-400 font-bold text-slate-950 text-[10px] px-1.5 py-0.5 rounded shadow">PIX SML</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium mt-1">QRCode gerado dinamicamente</span>
                      </div>

                      <div className="md:col-span-3 space-y-4">
                        <div>
                          <p className="text-xs text-[#9B8FC0]">Total a pagar:</p>
                          <p className="text-2xl font-extrabold text-white">R$ 29,90</p>
                        </div>

                        <div>
                          <p className="text-xs text-[#9B8FC0] mb-1">Código Pix tipo Copia e Cola:</p>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              readOnly 
                              value="00020126580014BR.GOV.BCB.PIX0136syncou-charge-simulated-..." 
                              className="w-full text-xs bg-[#0B0914] border border-[#2D214F] text-[#9B8FC0] rounded px-3 py-2 select-all focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleCopyPix}
                              className="px-3 bg-[#1D1733] border border-[#2D214F] hover:bg-[#2D214F] rounded text-[#E2D9F3] transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-amber-300">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>O QR Code expira em: <strong>{formatTimer(pixTimer)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1D1733] border border-[#2D214F] rounded-lg p-4 flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Simulação Rápida em 1 Clique</h4>
                        <p className="text-xs text-[#9B8FC0] mt-0.5">
                          Para fins de demonstração, clique no botão para simular a resposta de confirmação de pagamento instantânea do PIX do Banco Central do Brasil.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTab('plans')}
                        className="text-[#9B8FC0] border-[#2D214F] hover:bg-[#130E20]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSimulatePayment}
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold shadow-lg flex items-center justify-center gap-1.5"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Verificando Transação...
                          </>
                        ) : (
                          <>
                            Simular Pagamento Pago (Aprovação Rápida)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Form section */}
                      <form onSubmit={(e) => { e.preventDefault(); handleSimulatePayment(); }} className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#9B8FC0] mb-1">Número do Cartão de Crédito</label>
                          <input 
                            type="text" 
                            required
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                            className="w-full bg-[#0B0914] border border-[#2D214F] focus:border-amber-400 text-white rounded px-3 py-2 text-sm focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#9B8FC0] mb-1">Nome no Cartão</label>
                          <input 
                            type="text" 
                            required
                            placeholder="MARTA S SILVA"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            className="w-full bg-[#0B0914] border border-[#2D214F] focus:border-amber-400 text-white rounded px-3 py-2 text-sm focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#9B8FC0] mb-1">Validade</label>
                            <input 
                              type="text" 
                              required
                              placeholder="MM/AA"
                              value={cardExpiry}
                              onChange={(e) => {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length >= 2) {
                                  v = v.substring(0,2) + '/' + v.substring(2,4);
                                }
                                setCardExpiry(v.substring(0, 5));
                              }}
                              className="w-full bg-[#0B0914] border border-[#2D214F] focus:border-amber-400 text-white rounded px-3 py-2 text-sm focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#9B8FC0] mb-1">CVV</label>
                            <input 
                              type="password" 
                              required
                              placeholder="123"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                              className="w-full bg-[#0B0914] border border-[#2D214F] focus:border-amber-400 text-white rounded px-3 py-2 text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setTab('plans')}
                            className="text-[#9B8FC0] border-[#2D214F]"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                            ) : null}
                            Assinar com Cartão Simulado (R$ 29,90/mês)
                          </Button>
                        </div>
                      </form>

                      {/* Card layout preview */}
                      <div className="flex flex-col justify-center">
                        <div className="bg-gradient-to-br from-violet-700 via-[#1D1733] to-slate-900 rounded-xl p-5 border border-[#2D214F] shadow-lg text-white space-y-6 aspect-video flex flex-col justify-between relative overflow-hidden">
                          {/* Card details */}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] text-[#9B8FC0] uppercase tracking-wider font-bold">Syncou Card Private</p>
                              <div className="w-8 h-6 bg-amber-400/25 border border-amber-400/40 rounded mt-1.5" />
                            </div>
                            <Crown className="w-6 h-6 text-amber-400 fill-amber-400/20" />
                          </div>

                          <div>
                            <p className="font-mono text-base tracking-widest text-shadow">
                              {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                            </p>
                          </div>

                          <div className="flex justify-between text-xs font-mono">
                            <div>
                              <p className="text-[9px] text-[#9B8FC0] uppercase">Membro desde</p>
                              <p className="text-white font-bold">{cardName || 'NOME IMPRESSO'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-[#9B8FC0] uppercase">Validade</p>
                              <p className="text-white font-semibold">{cardExpiry || '12/30'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
