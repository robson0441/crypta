import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Key, RefreshCw, ChevronRight, Copy, Download, Check } from 'lucide-react';
import { generateIdentity, restoreIdentity } from '../lib/crypto';
import type { Identity } from '../types';

interface OnboardingProps {
  onComplete: (identity: Identity) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'generate' | 'mnemonic' | 'restore'>('welcome');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const id = generateIdentity();
    setIdentity(id);
    setStep('mnemonic');
  };

  const handleRestore = () => {
    const id = restoreIdentity(inputKey.trim());
    if (id) {
      onComplete(id);
    } else {
      alert('Chave Mestra inválida');
    }
  };

  const copyToClipboard = () => {
    if (identity) {
      navigator.clipboard.writeText(identity.masterKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadIdentity = () => {
    if (identity) {
      const element = document.createElement("a");
      const file = new Blob([JSON.stringify(identity, null, 2)], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `crypta_identity_${identity.cryptaId}.json`;
      document.body.appendChild(element);
      element.click();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121b22] text-[#e9edef] p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {step === 'welcome' && (
          <div className="space-y-8 text-center">
            <div className="mx-auto w-20 h-20 bg-[#00a884]/20 rounded-3xl flex items-center justify-center shadow-[0_0_20px_rgba(0,168,132,0.15)] transition-all border border-[#00a884]/20">
              <Shield className="w-10 h-10 text-[#00a884]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 text-white uppercase tracking-widest">CRYPTA <span className="text-[#00a884] font-light">CHAT</span></h1>
              <p className="text-[#8696a0] text-sm leading-relaxed">Mensagens privadas, sem números, sem e-mails. A identidade é sua, o controle também.</p>
            </div>
            <div className="space-y-4 pt-4">
              <button 
                onClick={() => setStep('generate')}
                className="w-full bg-[#00a884] text-[#121b22] font-semibold py-4 rounded-full shadow-lg hover:opacity-90 transition-all flex items-center justify-center group"
              >
                Gerar Nova Identidade
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setStep('restore')}
                className="w-full bg-transparent border border-[#233138] text-[#e9edef] font-semibold py-4 rounded-full hover:bg-white/5 transition-all"
              >
                Importar via Chave Mestra
              </button>
            </div>
          </div>
        )}

        {step === 'generate' && (
          <div className="text-center space-y-8">
            <h2 className="text-2xl font-bold text-white">Gerando Identidade</h2>
            <div className="py-12 flex justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-12 h-12 text-[#00a884]" />
              </motion.div>
            </div>
            <p className="text-[#8696a0]">Criptografando suas chaves RSA-4096...</p>
            <button 
              onClick={handleGenerate}
              className="w-full bg-[#00a884] text-[#121b22] font-semibold py-4 rounded-full"
            >
              Confirmar
            </button>
          </div>
        )}

        {step === 'mnemonic' && identity && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-white">Sua Identidade</h2>
              <p className="text-sm text-[#8696a0]">Este é o seu <span className="text-[#00a884]">Crypta-ID</span>. Guarde sua Chave Mestra para recuperar sua conta.</p>
            </div>
            
            <div className="bg-[#1f2c34] border border-[#233138] p-6 rounded-[32px] space-y-4 shadow-xl">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[#00a884] font-black">Seu Crypta-ID</label>
                <p className="text-2xl font-mono font-bold text-white tracking-tighter">{identity.cryptaId}</p>
              </div>

              <div className="pt-4 border-t border-[#233138] space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[#8696a0] font-bold">Chave Mestra de Recuperação</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#121b22] border border-[#233138] p-3 rounded-xl font-mono text-xs text-[#e9edef] break-all">
                    {identity.masterKey}
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="p-3 bg-[#2a3942] border border-[#233138] rounded-xl hover:bg-[#233138] transition-all text-[#00a884]"
                  >
                    {copied ? <Check className="w-5 h-5 text-[#00a884]" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={downloadIdentity}
                className="flex items-center justify-center gap-2 py-4 bg-transparent border border-[#233138] text-white rounded-full text-sm font-semibold hover:bg-white/5 transition-all"
              >
                <Download className="w-4 h-4" />
                Baixar Backup
              </button>
              <button 
                onClick={() => onComplete(identity)}
                className="py-4 bg-[#00a884] text-[#121b22] font-semibold rounded-full shadow-lg"
              >
                Tudo Pronto
              </button>
            </div>
          </div>
        )}

        {step === 'restore' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-white">Restaurar Acesso</h2>
              <p className="text-sm text-[#8696a0]">Cole sua Chave Mestra abaixo para recuperar seu Crypta-ID.</p>
            </div>
            
            <textarea 
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full bg-[#2a3942] border border-[#233138] rounded-2xl p-4 h-32 focus:outline-none focus:border-[#00a884] transition-all text-sm font-mono text-[#e9edef]"
              placeholder="Sua chave mestra..."
            />

            <button 
              onClick={handleRestore}
              className="w-full bg-[#00a884] text-[#121b22] font-semibold py-4 rounded-full shadow-lg"
            >
              Sincronizar Identidade
            </button>
            <button 
              onClick={() => setStep('welcome')}
              className="w-full text-[#8696a0] text-sm hover:text-[#e9edef] transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
