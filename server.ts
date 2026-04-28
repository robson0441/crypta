import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT || 3000;

  // In-memory registry for Crypta-IDs to socket IDs
  // In a real app, this would be a distributed cache like Redis or a DB
  const registry = new Map<string, string>();
  // Reverse look-up for cleanup
  const socketToId = new Map<string, string>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', (cryptaId: string) => {
      console.log(`Registering ${cryptaId} to socket ${socket.id}`);
      registry.set(cryptaId, socket.id);
      socketToId.set(socket.id, cryptaId);
      // Join a room named after the Crypta-ID for targeted messaging
      socket.join(cryptaId);
      socket.join('GROUP_GLOBAL'); // All users join the global community
      socket.broadcast.emit('user:online', cryptaId);
    });

    socket.on('message:send', (data: { to: string, from: string, content: any, type: string }) => {
      console.log(`Message from ${data.from} to ${data.to}`);
      // Send to the recipient room
      io.to(data.to).emit('message:receive', data);
    });

    socket.on('typing:start', (data: { to: string, from: string }) => {
      io.to(data.to).emit('typing:status', { from: data.from, isTyping: true });
    });

    socket.on('typing:stop', (data: { to: string, from: string }) => {
      io.to(data.to).emit('typing:status', { from: data.from, isTyping: false });
    });

    // Group Chat Management
    socket.on('group:join', (groupId: string) => {
      socket.join(groupId);
      console.log(`User ${socket.id} joined group ${groupId}`);
    });

    socket.on('group:message', (data: { groupId: string, message: any }) => {
      // Broadcast to everyone in the room except the sender
      socket.to(data.groupId).emit('group:message', data);
    });

    // Call Management Signaling
    socket.on('call:request', (data: { to: string, from: string, type: string, callerName?: string, callerAvatar?: string }) => {
      console.log(`Call request from ${data.from} to ${data.to} (${data.type})`);
      socket.to(data.to).emit('call:incoming', data);
    });

    socket.on('call:accept', (data: { to: string, from: string }) => {
      io.to(data.to).emit('call:accepted', data);
    });

    socket.on('call:reject', (data: { to: string, from: string }) => {
      io.to(data.to).emit('call:rejected', data);
    });

    socket.on('call:hangup', (data: { to: string, from: string }) => {
      io.to(data.to).emit('call:ended', data);
    });

    // WebRTC Signaling for VoIP/Video
    socket.on('webrtc:signal', (data: { to: string, from: string, signal: any }) => {
      io.to(data.to).emit('webrtc:signal', { from: data.from, signal: data.signal });
    });

    socket.on('disconnect', () => {
      const cryptaId = socketToId.get(socket.id);
      if (cryptaId) {
        registry.delete(cryptaId);
        socketToId.delete(socket.id);
        socket.broadcast.emit('user:offline', cryptaId);
        console.log(`User ${cryptaId} disconnected`);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
