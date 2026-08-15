'use client';

import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

const url = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:4000';

export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline';

interface SocketStore {
  socket: Socket | null;
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
}

export const useSocket = create<SocketStore>((set, get) => ({
  socket: null,
  status: 'idle',

  connect: () => {
    if (get().socket) return;
    set({ status: 'connecting' });

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 600,
    });

    socket.on('connect', () => set({ status: 'online' }));
    socket.on('disconnect', () => set({ status: 'offline' }));
    socket.on('connect_error', () => set({ status: 'offline' }));

    set({ socket });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, status: 'idle' });
  },
}));
