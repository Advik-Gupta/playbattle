export type RoomPhase = 'lobby' | 'countdown' | 'playing' | 'over';

export interface RoomConfig {
  rounds: number;
  secondsPerRound: number;
  maxPlayers: number;
  visibility: 'private' | 'open';
}

export const DEFAULT_CONFIG: RoomConfig = {
  rounds: 3,
  secondsPerRound: 120,
  maxPlayers: 2,
  visibility: 'private',
};

export const CONFIG_LIMITS = {
  rounds: [1, 3, 5, 7],
  secondsPerRound: [0, 60, 90, 120, 180],
  maxPlayers: [2, 3, 4],
} as const;

export const ROOM_CODE_LENGTH = 5;
export const MAX_ROOM_PLAYERS = 4;

export interface PlayerProfile {
  id: string;
  name: string;
}

export interface PlayerView {
  profile: PlayerProfile;
  connected: boolean;
  ready: boolean;
  score: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  config: RoomConfig;
  phase: RoomPhase;
  round: number;
  players: PlayerView[];
  deadline: number | null;
  now: number;
}

export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ClientToServerEvents {
  'room:create': (config: Partial<RoomConfig>, ack: (res: Ack<{ code: string }>) => void) => void;
  'room:join': (code: string, ack: (res: Ack<{ code: string }>) => void) => void;
  'room:leave': (ack: (res: Ack<null>) => void) => void;
  'room:ready': (ready: boolean, ack: (res: Ack<null>) => void) => void;
  'room:config': (config: Partial<RoomConfig>, ack: (res: Ack<null>) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:closed': (reason: string) => void;
  toast: (payload: { kind: 'info' | 'error' | 'success'; message: string }) => void;
}

export interface SocketData {
  profile: PlayerProfile | null;
  roomCode: string | null;
}
