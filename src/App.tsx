import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Onboarding from './components/Onboarding';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import ProfileSettings from './components/ProfileSettings';
import CallOverlay from './components/CallOverlay';
import { getSocket, disconnectSocket } from './lib/socket';
import { encryptMessage, decryptMessage } from './lib/crypto';
import type { Message, ChatSession, Identity, CallState, CallType } from './types';

export default function App() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<any[]>([]);

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingSignalsRef.current = [];
    setCallState({ status: 'idle' });
  }, []);

  // Persist identity
  useEffect(() => {
    const saved = localStorage.getItem('cryptchat_identity');
    if (saved) {
      setIdentity(JSON.parse(saved));
    }
  }, []);

  const handleOnboardingComplete = (id: Identity) => {
    localStorage.setItem('cryptchat_identity', JSON.stringify(id));
    setIdentity(id);
  };

  // Socket management
  useEffect(() => {
    if (!identity) return;

    // Initialize global community session if not exists
    setSessions(prev => {
      if (prev.some(s => s.recipientId === 'GROUP_GLOBAL')) return prev;
      return [{
        recipientId: 'GROUP_GLOBAL',
        isGroup: true,
        groupName: 'Comunidade Crypta 🔥',
        messages: [{
          id: 'welcome-msg',
          senderId: 'SYSTEM',
          senderName: 'Crypta Bot',
          content: 'Bem-vindo à rede descentralizada! Este é o canal global. Compartilhe seu ID para conversas privadas E2EE.',
          timestamp: Date.now(),
          isEncrypted: false
        }],
        unreadCount: 1,
        lastMessage: 'Bem-vindo à rede!'
      }, ...prev];
    });

    const socket = getSocket();

    socket.on('connect', () => {
      socket.emit('register', identity.cryptaId);
      socket.emit('group:join', 'GROUP_GLOBAL');
    });

    socket.on('message:receive', (data: any) => {
      // In a real app, we'd decrypt here
      // For this demo, we'll treat it as plaintext OR decrypt if we have the peer key
      const newMessage: Message = {
        id: uuidv4(),
        senderId: data.from,
        senderName: data.senderName,
        content: data.content,
        timestamp: Date.now(),
        isEncrypted: true,
        type: data.type || 'text'
      };

      setSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.recipientId === data.from);
        if (sessionIndex === -1) {
          return [...prev, {
            recipientId: data.from,
            messages: [newMessage],
            lastMessage: newMessage.content,
            unreadCount: activeSessionId === data.from ? 0 : 1
          }];
        }
        const updated = [...prev];
        updated[sessionIndex] = {
          ...updated[sessionIndex],
          messages: [...updated[sessionIndex].messages, newMessage],
          lastMessage: newMessage.content,
          unreadCount: activeSessionId === data.from ? 0 : updated[sessionIndex].unreadCount + 1
        };
        return updated;
      });
    });

    socket.on('typing:status', (data: { from: string, isTyping: boolean }) => {
      setTypingUsers(prev => ({ ...prev, [data.from]: data.isTyping }));
    });

    socket.on('group:message', (data: { groupId: string, message: Message }) => {
      setSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.recipientId === data.groupId);
        if (sessionIndex === -1) {
          // New group discovery (simplified)
          return [...prev, {
            recipientId: data.groupId,
            isGroup: true,
            groupName: `Grupo ${data.groupId.substring(6, 11)}`,
            messages: [data.message],
            unreadCount: 1,
            lastMessage: data.message.content
          }];
        }
        
        const newSessions = [...prev];
        const session = { ...newSessions[sessionIndex] };
        session.messages = [...session.messages, data.message];
        session.unreadCount = activeSessionId === data.groupId ? 0 : session.unreadCount + 1;
        session.lastMessage = data.message.content;
        newSessions[sessionIndex] = session;
        return newSessions;
      });
    });

    socket.on('call:incoming', (data: { from: string, type: CallType, callerName?: string, callerAvatar?: string }) => {
      // Ignore calls from self
      if (data.from === identity.cryptaId) return;
      
      setCallState({
        status: 'incoming',
        type: data.type,
        remoteId: data.from,
        remoteName: data.callerName,
        remoteAvatar: data.callerAvatar
      });
    });

    socket.on('webrtc:signal', async (data: { from: string, signal: any }) => {
      if (!peerConnectionRef.current) {
        pendingSignalsRef.current.push(data.signal);
        return;
      }

      try {
        if (data.signal.type === 'offer') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            to: data.from,
            from: identity.cryptaId,
            signal: answer
          });
        } else if (data.signal.type === 'answer') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
        } else if (data.signal.type === 'candidate') {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    socket.on('call:accepted', async (data: { from: string }) => {
      // Caller side receives acceptance
      if (!peerConnectionRef.current || !localStreamRef.current) return;
      
      setCallState(prev => ({ ...prev, status: 'active' }));
      
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('webrtc:signal', {
          to: data.from,
          from: identity.cryptaId,
          signal: offer
        });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    });

    socket.on('call:rejected', () => {
      cleanupCall();
    });

    socket.on('call:ended', () => {
      cleanupCall();
    });

    return () => {
      disconnectSocket();
    };
  }, [identity, activeSessionId]);

  const selectSession = (id: string) => {
    setActiveSessionId(id);
    if (id.startsWith('GROUP_')) {
      getSocket().emit('group:join', id);
    }
    setSessions(prev => prev.map(s => s.recipientId === id ? { ...s, unreadCount: 0 } : s));
  };

  const sendMessage = (content: string, type: Message['type'] = 'text') => {
    if (!identity || !activeSessionId) return;

    const socket = getSocket();
    const isGroup = activeSessionId.startsWith('GROUP_');

    const newMessage: Message = {
      id: uuidv4(),
      senderId: identity.cryptaId,
      senderName: identity.name,
      content,
      timestamp: Date.now(),
      isEncrypted: true,
      type
    };

    if (isGroup) {
      socket.emit('group:message', {
        groupId: activeSessionId,
        message: newMessage
      });
    } else {
      socket.emit('message:send', {
        to: activeSessionId,
        from: identity.cryptaId,
        senderName: identity.name,
        content,
        type
      });
    }

    setSessions(prev => {
      const idx = prev.findIndex(s => s.recipientId === activeSessionId);
      if (idx === -1) {
        // If it was a group creation, we might need to add the session here
        const newSession: ChatSession = {
          recipientId: activeSessionId,
          isGroup: isGroup,
          groupName: isGroup ? `Grupo ${activeSessionId.substring(6, 11)}` : undefined,
          messages: [newMessage],
          unreadCount: 0,
          lastMessage: content
        };
        return [...prev, newSession];
      }
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        messages: [...updated[idx].messages, newMessage],
        lastMessage: content
      };
      return updated;
    });
  };

  const setTyping = (isTyping: boolean) => {
    if (!identity || !activeSessionId) return;
    const socket = getSocket();
    socket.emit(isTyping ? 'typing:start' : 'typing:stop', {
      to: activeSessionId,
      from: identity.cryptaId
    });
  };

  const handleAddChat = (id: string) => {
    if (sessions.some(s => s.recipientId === id)) return;
    setSessions(prev => [...prev, {
      recipientId: id,
      messages: [],
      unreadCount: 0
    }]);
  };

  const handleCreateGroup = (name: string, participants: string[], avatar?: string) => {
    if (!identity) return;
    const groupId = `GROUP_${uuidv4().substring(0, 8).toUpperCase()}`;
    const newSession: ChatSession = {
      recipientId: groupId,
      isGroup: true,
      groupName: name,
      groupAvatar: avatar,
      participants: [identity.cryptaId, ...participants],
      adminId: identity.cryptaId,
      messages: [{
        id: uuidv4(),
        senderId: 'SYSTEM',
        senderName: 'Sistema',
        content: `Grupo "${name}" criado.`,
        timestamp: Date.now(),
        isEncrypted: false
      }],
      unreadCount: 0,
      lastMessage: 'Grupo criado'
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(groupId);
    getSocket().emit('group:join', groupId);
  };

  const handleAddParticipant = (groupId: string, participantId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.recipientId === groupId) {
        return {
          ...s,
          participants: [...(s.participants || []), participantId],
          messages: [...s.messages, {
            id: uuidv4(),
            senderId: 'SYSTEM',
            senderName: 'Sistema',
            content: `Novo integrante adicionado: ${participantId}`,
            timestamp: Date.now(),
            isEncrypted: false
          }]
        };
      }
      return s;
    }));
  };

  const handleUpdateIdentity = (updates: Partial<Identity>) => {
    if (!identity) return;
    const newIdentity = { ...identity, ...updates };
    setIdentity(newIdentity);
    localStorage.setItem('cryptchat_identity', JSON.stringify(newIdentity));
  };

  const handleLogout = () => {
    localStorage.removeItem('cryptchat_identity');
    setIdentity(null);
    setIsSettingsOpen(false);
  };

  const handleStartCall = async (to: string, type: CallType) => {
    if (!identity) return;
    const socket = getSocket();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === 'video' 
      });
      
      localStreamRef.current = stream;
      setCallState({
        status: 'outgoing',
        type,
        remoteId: to,
        localStream: stream
      });

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:signal', {
            to,
            from: identity.cryptaId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        setCallState(prev => ({ ...prev, remoteStream: event.streams[0] }));
      };

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      peerConnectionRef.current = pc;

      socket.emit('call:request', {
        to,
        from: identity.cryptaId,
        type,
        callerName: identity.name,
        callerAvatar: identity.avatar
      });

    } catch (err) {
      console.error('Error starting call:', err);
      alert('Não foi possível acessar seu microfone/câmera.');
      cleanupCall();
    }
  };

  const handleAcceptCall = async () => {
    if (!identity || !callState.remoteId || !callState.type) return;
    const socket = getSocket();
    const targetId = callState.remoteId;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callState.type === 'video' 
      });

      localStreamRef.current = stream;
      setCallState(prev => ({ ...prev, status: 'active', localStream: stream }));

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:signal', {
            to: targetId,
            from: identity.cryptaId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        setCallState(prev => ({ ...prev, remoteStream: event.streams[0] }));
      };

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      peerConnectionRef.current = pc;

      // Processing pending signals if any
      for (const signal of pendingSignalsRef.current) {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            to: targetId,
            from: identity.cryptaId,
            signal: answer
          });
        } else if (signal.type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
      pendingSignalsRef.current = [];

      socket.emit('call:accept', { to: targetId, from: identity.cryptaId });

    } catch (err) {
      console.error('Error accepting call:', err);
      alert('Erro ao acessar microfone/câmera.');
      handleRejectCall();
    }
  };

  const handleRejectCall = () => {
    if (!identity || !callState.remoteId) return;
    const socket = getSocket();
    const targetId = callState.remoteId;
    socket.emit('call:reject', { to: targetId, from: identity.cryptaId });
    cleanupCall();
  };

  const handleHangup = () => {
    const socket = getSocket();
    const targetId = callState.remoteId;
    if (identity && targetId) {
      socket.emit('call:hangup', { to: targetId, from: identity.cryptaId });
    }
    cleanupCall();
  };

  if (!identity) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const activeSession = sessions.find(s => s.recipientId === activeSessionId);

  return (
    <div className="h-screen w-full max-w-md mx-auto overflow-hidden shadow-2xl bg-black relative">
      <CallOverlay 
        call={callState}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onHangup={handleHangup}
      />

      {isSettingsOpen ? (
        <ProfileSettings 
          identity={identity}
          onUpdate={handleUpdateIdentity}
          onBack={() => setIsSettingsOpen(false)}
          onLogout={handleLogout}
        />
      ) : !activeSessionId ? (
        <ChatList 
          identity={identity}
          sessions={sessions}
          onSelect={selectSession}
          onAdd={handleAddChat}
          onCreateGroup={handleCreateGroup}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : (
        <ChatRoom 
          recipientId={activeSessionId}
          currentUserId={identity.cryptaId}
          session={activeSession!}
          messages={activeSession?.messages || []}
          onBack={() => setActiveSessionId(null)}
          onSend={sendMessage}
          onTyping={setTyping}
          isRecipientTyping={typingUsers[activeSessionId] || false}
          onStartCall={(type) => activeSessionId && handleStartCall(activeSessionId, type)}
          onAddParticipant={(pId) => handleAddParticipant(activeSessionId!, pId)}
        />
      )}
    </div>
  );
}
