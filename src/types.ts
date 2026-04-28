export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface Identity {
  cryptaId: string;
  masterKey: string;
  publicKey: string;
  secretKey: string;
  name?: string;
  avatar?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: string | number;
  isEncrypted: boolean;
  type?: 'text' | 'image' | 'gif' | 'sticker' | 'audio';
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active';

export interface CallState {
  status: CallStatus;
  type?: CallType;
  remoteId?: string;
  remoteName?: string;
  remoteAvatar?: string;
}

export interface ChatSession {
  recipientId: string;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  participants?: string[];
  adminId?: string;
  messages: Message[];
  unreadCount: number;
  lastMessage?: string;
}
