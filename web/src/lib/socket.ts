'use client';

import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import type {
  ChatMessage,
  ClientToServerEvents,
  PlayerProfile,
  RoomState,
  ServerToClientEvents,
} from '@/lib/protocol';

const url = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:4000';

export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline';
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface Toast {
  id: number;
  kind: 'info' | 'error' | 'success';
  message: string;
}

interface SocketStore {
  socket: GameSocket | null;
  status: ConnectionStatus;
  room: RoomState | null;
  messages: ChatMessage[];
  toasts: Toast[];
  connect: (profile: PlayerProfile) => void;
  disconnect: () => void;
  clearRoom: () => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useSocket = create<SocketStore>((set, get) => ({
  socket: null,
  status: 'idle',
  room: null,
  messages: [],
  toasts: [],

  connect: (profile) => {
    if (get().socket) return;
    set({ status: 'connecting' });

    const socket: GameSocket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 600,
      auth: { profile },
    });

    socket.on('connect', () => set({ status: 'online' }));
    socket.on('disconnect', () => set({ status: 'offline' }));
    socket.on('connect_error', () => set({ status: 'offline' }));

    socket.on('room:state', (room) => set({ room }));

    socket.on('chat:history', (messages) => set({ messages }));

    socket.on('chat:message', (message) =>
      set((state) => ({ messages: [...state.messages, message].slice(-50) })),
    );

    socket.on('session:replaced', () => {
      toastId += 1;
      set((state) => ({
        toasts: [
          ...state.toasts,
          { id: toastId, kind: 'error', message: 'opened somewhere else, this tab is idle' },
        ],
      }));
    });

    socket.on('room:closed', (reason) => {
      toastId += 1;
      set((state) => ({
        room: null,
        messages: [],
        toasts: [...state.toasts, { id: toastId, kind: 'info', message: reason }],
      }));
    });

    socket.on('toast', ({ kind, message }) => {
      toastId += 1;
      set((state) => ({ toasts: [...state.toasts, { id: toastId, kind, message }] }));
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, status: 'idle', room: null, messages: [] });
  },

  clearRoom: () => set({ room: null, messages: [] }),

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function emit<E extends keyof ClientToServerEvents>(
  socket: GameSocket | null,
  event: E,
  ...args: Parameters<ClientToServerEvents[E]>
) {
  socket?.emit(event, ...args);
}
