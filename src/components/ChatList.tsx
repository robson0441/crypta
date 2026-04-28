import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, MessageSquare, Settings, UserPlus, User as UserIcon, MoreVertical } from 'lucide-react';
import type { ChatSession, Identity } from '../types';

interface ChatListProps {
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onAdd: (id: string) => void;
  onCreateGroup: (name: string, participants: string[], avatar?: string) => void;
  onOpenSettings: () => void;
  identity: Identity;
}

export default function ChatList({ sessions, onSelect, onAdd, onCreateGroup, onOpenSettings, identity }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newId, setNewId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [groupParticipants, setGroupParticipants] = useState('');
  const [activeTab, setActiveTab] = useState('CHATS');

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setGroupAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121b22] text-[#e9edef] relative">
      {/* Header */}
      <header className="bg-[#1f2c34] shadow-md z-10">
        <div className="p-4 pt-6 flex items-center justify-between">
          <div 
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-[#6a7175] overflow-hidden flex items-center justify-center cursor-pointer border border-white/5 active:scale-95 transition-all shadow-md"
          >
            {identity.avatar ? (
              <img src={identity.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-6 h-6 text-[#cfd3d6]" />
            )}
          </div>
          <div className="flex gap-5 text-[#8696a0]">
            <Search className="w-5 h-5 cursor-pointer" />
            <button onClick={onOpenSettings}>
              <MoreVertical className="w-5 h-5 cursor-pointer" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex text-sm font-bold tracking-wider">
          <button 
            onClick={() => setActiveTab('CHATS')}
            className={`flex-1 py-3 border-b-2 transition-all ${activeTab === 'CHATS' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0]'}`}
          >
            CONVERSAS
          </button>
          <button 
            onClick={() => setActiveTab('CALLS')}
            className={`flex-1 py-3 border-b-2 transition-all ${activeTab === 'CALLS' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0]'}`}
          >
            CHAMADAS
          </button>
        </div>
      </header>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-10">
              <p className="text-[#8696a0] text-sm">No chats yet. Press the button below to start a secure Crypta session.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.recipientId}
                onClick={() => onSelect(session.recipientId)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#202c33] transition-all active:bg-[#202c33]"
              >
                <div className="w-12 h-12 bg-[#6a7175] rounded-full flex items-center justify-center text-white text-xl overflow-hidden shrink-0">
                  {session.isGroup && session.groupAvatar ? (
                    <img src={session.groupAvatar} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-7 h-7" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0 border-b border-[#233138] pb-4 pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-[16px] truncate">
                      {session.isGroup ? session.groupName : `ID: ${session.recipientId}`}
                    </span>
                    <span className="text-[12px] text-[#8696a0]">12:45</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-[#8696a0] truncate flex-1 italic">
                      {session.isGroup && session.lastMessage ? `${session.messages[session.messages.length - 1]?.senderName || 'Sistema'}: ` : ''}
                      {session.lastMessage || 'Toque para iniciar'}
                    </p>
                    {session.unreadCount > 0 && (
                      <div className="ml-2 w-5 h-5 bg-[#00a884] text-[#121b22] text-[10px] font-bold rounded-full flex items-center justify-center">
                        {session.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-20">
        <button 
          onClick={() => setIsCreatingGroup(true)}
          className="w-12 h-12 bg-[#202c33] text-[#00a884] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 bg-[#00a884] text-[#121b22] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <MessageSquare className="w-6 h-6 fill-current" />
        </button>
      </div>

      {/* Add Contact Dialog */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-[#0b141a]/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#233138] w-full max-w-sm rounded-[32px] p-8 border border-[#233138] shadow-2xl"
            >
              <h2 className="text-xl font-medium mb-2 text-white">Novo Contato</h2>
              <p className="text-xs text-[#8696a0] mb-6 leading-relaxed">Insira o Crypta-ID para estabelecer conexão direta.</p>
              
              <input 
                autoFocus
                type="text"
                placeholder="CRYPTA-ID"
                className="w-full bg-[#2a3942] border border-transparent rounded-xl py-4 px-5 text-sm mb-6 focus:outline-none focus:border-[#00a884] transition-all font-mono text-[#e9edef] placeholder:opacity-30 uppercase"
                value={newId}
                onChange={(e) => setNewId(e.target.value.toUpperCase())}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 text-sm font-bold text-[#ea0038] uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (newId) onAdd(newId);
                    setIsAdding(false);
                    setNewId('');
                  }}
                  className="flex-1 py-3 bg-[#00a884] text-[#121b22] font-bold rounded-xl text-sm uppercase tracking-wider"
                >
                  Iniciar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Group Dialog */}
      <AnimatePresence>
        {isCreatingGroup && (
          <div className="fixed inset-0 bg-[#0b141a]/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#233138] w-full max-w-sm rounded-[32px] p-8 border border-[#233138] shadow-2xl"
            >
              <h2 className="text-xl font-medium mb-2 text-white">Novo Grupo</h2>
              <p className="text-xs text-[#8696a0] mb-6 leading-relaxed">Crie uma sala segura para o seu coletivo.</p>
              
              <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                  <div className="w-20 h-20 bg-[#2a3942] rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-[#8696a0] group-hover:border-[#00a884] transition-colors">
                    {groupAvatar ? (
                      <img src={groupAvatar} alt="Group Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserPlus className="w-8 h-8 text-[#8696a0]" />
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>

              <div className="space-y-4 mb-6">
                <input 
                  type="text"
                  placeholder="NOME DO GRUPO"
                  className="w-full bg-[#2a3942] border border-transparent rounded-xl py-3 px-5 text-sm focus:outline-none focus:border-[#00a884] transition-all text-[#e9edef] placeholder:opacity-30"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <textarea 
                  placeholder="CRYPTA-IDS (separados por vírgula)"
                  className="w-full bg-[#2a3942] border border-transparent rounded-xl py-3 px-5 text-sm focus:outline-none focus:border-[#00a884] transition-all font-mono text-[#e9edef] placeholder:opacity-30 h-24 resize-none"
                  value={groupParticipants}
                  onChange={(e) => setGroupParticipants(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setIsCreatingGroup(false);
                    setGroupName('');
                    setGroupAvatar('');
                    setGroupParticipants('');
                  }}
                  className="flex-1 py-3 text-sm font-bold text-[#ea0038] uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (groupName.trim()) {
                      const participants = groupParticipants.split(',').map(p => p.trim()).filter(p => p);
                      onCreateGroup(groupName, participants, groupAvatar);
                      setIsCreatingGroup(false);
                      setGroupName('');
                      setGroupAvatar('');
                      setGroupParticipants('');
                    }
                  }}
                  className="flex-1 py-3 bg-[#00a884] text-[#121b22] font-bold rounded-xl text-sm uppercase tracking-wider"
                >
                  Criar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
