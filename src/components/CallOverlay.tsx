import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, X, PhoneOff, User as UserIcon, Mic, MicOff, VideoOff, Volume2 } from 'lucide-react';
import type { CallState } from '../types';

interface CallOverlayProps {
  call: CallState;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
}

export default function CallOverlay({ call, onAccept, onReject, onHangup }: CallOverlayProps) {
  if (call.status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] bg-[#0b141a] flex flex-col items-center justify-between py-20 px-6 text-[#e9edef]"
      >
        {/* Background Gradient/Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#121b22] to-black opacity-50 -z-10" />

        {/* User Info */}
        <div className="flex flex-col items-center gap-6 mt-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-[#6a7175] flex items-center justify-center overflow-hidden shadow-2xl border-4 border-[#233138]">
              {call.remoteAvatar ? (
                <img src={call.remoteAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-16 h-16 text-[#cfd3d6]" />
              )}
            </div>
            {call.status === 'incoming' && (
              <div className="absolute -inset-4 border-2 border-[#00a884] rounded-full animate-ping opacity-20" />
            )}
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-medium mb-1">{call.remoteName || call.remoteId}</h2>
            <p className="text-[#8696a0] text-sm font-medium uppercase tracking-[0.2em]">
              {call.status === 'incoming' ? 'Chamada de entrada' : 
               call.status === 'outgoing' ? 'Chamada de saída' : 
               'Chamada ativa'}
            </p>
          </div>
        </div>

        {/* Call Actions */}
        <div className="w-full max-w-sm flex flex-col items-center gap-12">
          {call.status === 'active' && (
             <div className="flex justify-center gap-6 w-full">
                <button className="w-14 h-14 rounded-full bg-[#2a3942] flex items-center justify-center hover:bg-[#3b4a54] transition-all">
                  <Mic className="w-6 h-6" />
                </button>
                <button className="w-14 h-14 rounded-full bg-[#2a3942] flex items-center justify-center hover:bg-[#3b4a54] transition-all">
                  <VideoOff className="w-6 h-6" />
                </button>
                <button className="w-14 h-14 rounded-full bg-[#2a3942] flex items-center justify-center hover:bg-[#3b4a54] transition-all">
                  <Volume2 className="w-6 h-6" />
                </button>
             </div>
          )}

          <div className="flex justify-center gap-12 w-full">
            {call.status === 'incoming' ? (
              <>
                <button 
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-[#ea0038] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <button 
                  onClick={onAccept}
                  className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <Phone className="w-7 h-7 text-white" />
                </button>
              </>
            ) : (
              <button 
                onClick={onHangup}
                className="w-16 h-16 rounded-full bg-[#ea0038] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
