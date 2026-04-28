import { useState, useRef, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Camera, LogOut, Check, User as UserIcon } from 'lucide-react';
import type { Identity } from '../types';

interface ProfileSettingsProps {
  identity: Identity;
  onUpdate: (updates: Partial<Identity>) => void;
  onBack: () => void;
  onLogout: () => void;
}

export default function ProfileSettings({ identity, onUpdate, onBack, onLogout }: ProfileSettingsProps) {
  const [name, setName] = useState(identity.name || '');
  const [avatar, setAvatar] = useState(identity.avatar || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate({ name, avatar });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121b22] text-[#e9edef]">
      {/* Header */}
      <header className="p-4 pt-6 flex items-center gap-6 bg-[#1f2c34] shadow-md z-10">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-full transition-all text-[#8696a0]">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-medium text-[#e9edef]">Perfil</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-40 h-40 rounded-full bg-[#6a7175] overflow-hidden flex items-center justify-center shadow-xl">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-20 h-20 text-[#cfd3d6]" />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 p-3 bg-[#00a884] text-[#121b22] rounded-full shadow-lg hover:scale-105 transition-all"
            >
              <Camera className="w-6 h-6" />
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="space-y-2 border-b border-[#233138] pb-4">
            <label className="text-xs text-[#00a884] font-normal">Nome</label>
            <div className="flex items-center gap-3">
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome..."
                className="flex-1 bg-transparent border-none p-0 text-[16px] focus:ring-0 text-[#e9edef]"
              />
            </div>
            <p className="text-[12px] text-[#8696a0] mt-2">Esse não é seu nome de usuário nem seu PIN. Esse nome será visível para seus contatos do WhatsApp.</p>
          </div>

          <div className="space-y-2 border-b border-[#233138] pb-4">
            <label className="text-xs text-[#8696a0] font-normal">Crypta-ID</label>
            <p className="text-[16px] text-[#e9edef] font-mono">{identity.cryptaId}</p>
            <p className="text-[12px] text-[#8696a0] mt-2">Seu identificador único e estático na rede P2P.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-6">
          <button 
            onClick={handleSave}
            className="w-full bg-[#00a884] text-[#121b22] font-bold py-3.5 rounded-full shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-all uppercase tracking-wider text-sm"
          >
            {showSuccess ? <Check className="w-5 h-5" /> : 'Salvar Perfil'}
          </button>
          
          <div className="pt-8 border-t border-[#233138]">
            <button 
              onClick={() => {
                if(confirm('Isso apagará permanentemente sua identidade deste dispositivo. Certifique-se de ter sua Chave Mestra!')) {
                  onLogout();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-[#ea0038] uppercase tracking-widest bg-transparent border border-[#ea0038]/20 rounded-full hover:bg-[#ea0038]/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Apagar Conta deste Dispositivo
            </button>
          </div>
        </div>
      </div>

      <footer className="p-6 text-center text-[10px] text-[#8696a0] font-mono opacity-50">
        CRYPTA SECURE // AES-256-GCM // P2P
      </footer>
    </div>
  );
}
