import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Send, MoreVertical, ShieldCheck, Image as ImageIcon, Paperclip, Phone, Video, User as UserIcon, Lock, CheckCheck, Plus, Mic, Smile, UserPlus, X, Trash2, Play, Pause } from 'lucide-react';
import MediaPicker from './MediaPicker';
import type { Message, ChatSession } from '../types';

interface ChatRoomProps {
  recipientId: string;
  currentUserId: string;
  session: ChatSession;
  messages: Message[];
  onBack: () => void;
  onSend: (content: string, type?: Message['type']) => void;
  onTyping: (isTyping: boolean) => void;
  isRecipientTyping: boolean;
  onStartCall: (type: 'audio' | 'video') => void;
  onAddParticipant: (participantId: string) => void;
}

const AudioPlayer = ({ src, timestamp, isMe }: { src: string, timestamp: number | string, isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isNaN(p) ? 0 : p);
    }
  };

  return (
    <div className="flex items-center gap-3 py-1 pr-1 min-w-[200px]">
      <audio ref={audioRef} src={src} onTimeUpdate={onTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
      <button 
        onClick={togglePlay}
        className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center shrink-0 hover:bg-[#00c99d] transition-colors"
      >
        {isPlaying ? <Pause className="w-5 h-5 text-white fill-current" /> : <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-white/20 rounded-full w-full relative cursor-pointer" onClick={(e) => {
            if (audioRef.current && audioRef.current.duration) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const p = x / rect.width;
                audioRef.current.currentTime = p * audioRef.current.duration;
            }
        }}>
          <div className="absolute top-0 left-0 h-full bg-white/60 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[10px] text-white/70 uppercase font-bold tracking-tighter">Audio</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/70">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatRoom({ recipientId, currentUserId, session, messages, onBack, onSend, onTyping, isRecipientTyping, onStartCall, onAddParticipant }: ChatRoomProps) {
  const [input, setInput] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Seu navegador não suporta gravação de áudio.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length === 0) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/wav' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          onSend(base64, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        alert('Permissão de microfone negada. Se você estiver usando o modo de visualização, tente abrir o aplicativo em uma nova aba. Caso contrário, verifique as configurações de privacidade do seu navegador.');
      } else {
        alert('Não foi possível iniciar a gravação de áudio.');
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; 
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRecipientTyping, isUploading]);

  const simulateUpload = async (callback: () => void) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const steps = [15, 40, 70, 90, 100];
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      setUploadProgress(step);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    callback();
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
      onTyping(false);
      setShowMediaPicker(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 5MB for base64 demo performance
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      simulateUpload(() => onSend(base64, 'image'));
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] text-[#e9edef] relative overflow-hidden">
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" 
           style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/678/HD-wallpaper-whatsapp-dark-background-whatsapp-dark-pattern.jpg")', backgroundSize: '400px' }} 
      />

      {/* Header */}
      <header className="p-2 flex items-center justify-between bg-[#1f2c34] z-10 shadow-sm">
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="p-1.5 hover:bg-white/5 rounded-full transition-all shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-9 h-9 bg-[#6a7175] rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden">
              {session.isGroup && session.groupAvatar ? (
                <img src={session.groupAvatar} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate max-w-[140px]">
                {session.isGroup ? session.groupName : recipientId}
              </p>
              <p className="text-[11px] text-[#8696a0] truncate max-w-[120px]">
                {session.isGroup 
                  ? `${session.participants?.length || 0} integrantes: ${session.participants?.join(', ')}` 
                  : 'online'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-2">
          {!recipientId.startsWith('GROUP_') && (
            <>
              <button 
                onClick={() => onStartCall('video')}
                className="p-2.5 text-[#8696a0] hover:bg-white/5 rounded-full"
              >
                <Video className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onStartCall('audio')}
                className="p-2.5 text-[#8696a0] hover:bg-white/5 rounded-full"
              >
                <Phone className="w-5 h-5" />
              </button>
            </>
          )}
          {session.isGroup && session.adminId === currentUserId && (
             <button 
                onClick={() => setIsAddingMember(true)}
                className="p-2.5 text-[#00a884] hover:bg-white/5 rounded-full"
              >
                <UserPlus className="w-5 h-5" />
              </button>
          )}
          <button className="p-2.5 text-[#8696a0] hover:bg-white/5 rounded-full"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar z-0"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-[#182229] px-3 py-1.5 rounded-lg border border-[#233138] shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-[#ffbc22]" />
              <span className="text-[11px] text-[#8696a0] font-normal leading-tight text-center">
                Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.
              </span>
            </div>
          </div>
        </div>

        {messages.map((msg, i) => {
          const isMe = msg.senderId === currentUserId;
          const isMedia = msg.type === 'gif' || msg.type === 'image' || msg.type === 'sticker';

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-lg shadow-sm text-[14.2px] leading-tight relative ${
                  isMedia ? 'bg-transparent' : isMe 
                    ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none px-2.5 py-1.5' 
                    : 'bg-[#202c33] text-[#e9edef] rounded-tl-none px-2.5 py-1.5'
                }`}
              >
                {!isMe && recipientId.startsWith('GROUP_') && (
                  <p className={`text-[11px] font-bold mb-1 ${isMedia ? 'bg-[#202c33]/80 px-2 py-0.5 rounded-full w-fit backdrop-blur-sm' : 'text-[#34b7f1]'}`}>
                    {msg.senderName || msg.senderId}
                  </p>
                )}

                {msg.type === 'audio' ? (
                  <AudioPlayer src={msg.content} timestamp={msg.timestamp} isMe={isMe} />
                ) : isMedia ? (
                  <div className="relative group overflow-hidden rounded-xl border border-[#2a3942]">
                    <img 
                      src={msg.content} 
                      alt="Media content" 
                      className="max-w-full max-h-[300px] object-contain block bg-[#182229]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                      <span className="text-[10px] text-white opacity-90 uppercase font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center gap-1 ml-auto pt-1">
                      <span className="text-[10px] text-[#8696a0] opacity-80 uppercase font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                    </div>
                  </div>
                )
              }
              </div>
            </motion.div>
          );
        })}

        {isRecipientTyping && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex justify-start pl-1"
          >
            <div className="bg-[#202c33] px-3 py-2 rounded-lg flex gap-1 items-center">
              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-pulse [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-[#8696a0] rounded-full animate-pulse [animation-delay:0.4s]" />
            </div>
          </motion.div>
        )}
        
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end mb-4 pr-1"
          >
            <div className="bg-[#005c4b] px-4 py-3 rounded-2xl shadow-xl min-w-[160px] border border-white/5">
              <div className="flex items-center justify-between mb-2 gap-4">
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">Enviando...</span>
                <span className="text-[10px] font-mono text-[#00a884] bg-black/20 px-1.5 py-0.5 rounded">{uploadProgress}%</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-[#00a884]"
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Add Member Dialog */}
      <AnimatePresence>
        {isAddingMember && (
          <div className="fixed inset-0 bg-[#0b141a]/90 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#233138] w-full max-w-sm rounded-[32px] p-8 border border-[#233138] shadow-2xl"
            >
              <h2 className="text-xl font-medium mb-2 text-white">Adicionar Membro</h2>
              <p className="text-xs text-[#8696a0] mb-6 leading-relaxed">Convide um peer para este grupo seguro.</p>
              
              <input 
                autoFocus
                type="text"
                placeholder="CRYPTA-ID"
                className="w-full bg-[#2a3942] border border-transparent rounded-xl py-4 px-5 text-sm mb-6 focus:outline-none focus:border-[#00a884] transition-all font-mono text-[#e9edef] placeholder:opacity-30 uppercase"
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value.toUpperCase())}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsAddingMember(false)}
                  className="flex-1 py-3 text-sm font-bold text-[#ea0038] uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (newMemberId) onAddParticipant(newMemberId);
                    setIsAddingMember(false);
                    setNewMemberId('');
                  }}
                  className="flex-1 py-3 bg-[#00a884] text-[#121b22] font-bold rounded-xl text-sm uppercase tracking-wider"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <footer className="p-2.5 bg-transparent z-10 flex flex-col gap-2 px-2 pb-3">
        <AnimatePresence>
          {showMediaPicker && (
            <motion.div 
              initial={{ y: 50, opacity: 0, height: 0 }}
              animate={{ y: 0, opacity: 1, height: '380px' }}
              exit={{ y: 50, opacity: 0, height: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="bg-[#233138] rounded-[24px] overflow-hidden mb-2 shadow-2xl border border-white/5 flex flex-col relative"
            >
              <MediaPicker 
                onEmojiClick={(emojiData) => {
                  setInput(prev => prev + emojiData.emoji);
                  onTyping(true);
                }}
                onGifSelect={(gifUrl) => {
                  simulateUpload(() => onSend(gifUrl, 'gif'));
                  setShowMediaPicker(false);
                }}
                onClose={() => setShowMediaPicker(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 w-full">
          <div className="flex-1 flex items-center gap-3 bg-[#2a3942] rounded-[24px] px-3 py-1.5 relative overflow-hidden">
            {isRecording ? (
               <div className="flex-1 flex items-center gap-4 py-1.5 h-[38px] animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#ea0038] rounded-full animate-pulse" />
                    <span className="text-[15px] font-medium text-[#e9edef] tabular-nums">{formatDuration(recordingDuration)}</span>
                  </div>
                  <div className="flex-1 text-[#8696a0] text-sm truncate bg-gradient-to-r from-[#8696a0] to-transparent bg-clip-text text-transparent animate-pulse">
                    Deslize para cancelar
                  </div>
                  <button 
                    onClick={cancelRecording}
                    className="p-1 hover:bg-white/5 rounded-full transition-colors text-[#ea0038]"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
               </div>
            ) : (
              <>
                <button 
                  onClick={() => setShowMediaPicker(!showMediaPicker)}
                  className={`p-1 transition-colors ${showMediaPicker ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                >
                  <Smile className="w-6 h-6" />
                </button>
                <textarea 
                  rows={1}
                  value={input}
                  onFocus={() => setShowMediaPicker(false)}
                  onChange={(e) => {
                    setInput(e.target.value);
                    onTyping(e.target.value.length > 0);
                  }}
                  placeholder="Digite uma mensagem"
                  className="flex-1 bg-transparent border-none focus:ring-0 text-[#e9edef] text-[15px] py-1.5 resize-none max-h-32 placeholder:text-[#8696a0]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button className="text-[#8696a0] p-1"><Paperclip className="w-5 h-5 -rotate-45" /></button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#8696a0] p-1 hover:text-[#00a884] transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </>
            )}
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
          
          <button 
            onClick={() => {
              if (input.trim()) {
                handleSend();
              } else if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${input.trim() || isRecording ? 'bg-[#00a884] text-[#121b22] scale-110' : 'bg-[#00a884] text-[#121b22]'}`}
          >
            {input.trim() ? (
              <Send className="w-5 h-5 pl-0.5" />
            ) : isRecording ? (
              <div className="relative flex items-center justify-center">
                 <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                 <Send className="w-5 h-5 relative z-10" />
              </div>
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
