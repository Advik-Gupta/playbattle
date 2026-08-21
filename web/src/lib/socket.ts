'use client';

import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { notify } from '@/lib/notify';
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
  resumed: string | null;
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
  resumed: null,
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

    socket.on('room:resume', ({ code }) => {
      toastId += 1;
      set((state) => ({
        resumed: code,
        toasts: [
          ...state.toasts,
          { id: toastId, kind: 'info' as const, message: `back in room ${code}` },
        ].slice(-4),
      }));
    });

    socket.on('chat:history', (messages) => set({ messages }));

    socket.on('room:removed', (reason) => {
      toastId += 1;
      set((state) => ({
        room: null,
        resumed: null,
        messages: [],
        toasts: [...state.toasts, { id: toastId, kind: 'error', message: reason }],
      }));
    });

    socket.on('invite:received', (invite) => {
      notify('Game invite', `${invite.fromName} wants to play`);
    });

    socket.on('queue:matched', () => {
      notify('Opponent found', 'Your match is ready');
    });

    socket.on('room:joinRequest', (request) => {
      notify('Someone wants in', `${request.name} is asking to join your room`);
    });

    socket.on('room:joinResponse', ({ accepted }) => {
      toastId += 1;
      set((state) => ({
        toasts: [
          ...state.toasts,
          {
            id: toastId,
            kind: accepted ? 'success' : 'error',
            message: accepted ? 'the host let you in' : 'the host said no',
          },
        ],
      }));
    });

    socket.on('sanction:notice', (sanction) => {
      toastId += 1;
      set((state) => ({
        toasts: [
          ...state.toasts,
          {
            id: toastId,
            kind: 'error',
            message: sanction.reason ? `warning: ${sanction.reason}` : 'you have a warning',
          },
        ],
      }));
    });

    socket.on('queue:matched', () => {
      toastId += 1;
      set((state) => ({
        toasts: [...state.toasts, { id: toastId, kind: 'success', message: 'opponent found' }],
      }));
    });

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
      set((state) => ({ toasts: [...state.toasts, { id: toastId, kind, message }].slice(-4) }));
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, status: 'idle', room: null, resumed: null, messages: [] });
  },

  clearRoom: () => set({ room: null, resumed: null, messages: [] }),

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function emit<E extends keyof ClientToServerEvents>(
  socket: GameSocket | null,
  event: E,
  ...args: Parameters<ClientToServerEvents[E]>
) {
  socket?.emit(event, ...args);
}
