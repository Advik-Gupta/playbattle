export type Tile = 'correct' | 'present' | 'absent';

export type RoomPhase = 'lobby' | 'playing' | 'round_over' | 'match_over';

export const WORD_LENGTH = 5;

export type GameMode = 'race' | 'solo' | 'daily';

export type GameId = 'wordbattle' | 'tictactoe' | 'anagram';

export const GAMES: { id: GameId; name: string; tagline: string }[] = [
  { id: 'wordbattle', name: 'WordBattle', tagline: 'Guess the word before they do' },
  { id: 'tictactoe', name: 'Tic Tac Toe', tagline: 'Three in a row, best of three' },
  { id: 'anagram', name: 'Anagram Rush', tagline: 'One letter pool, sixty seconds' },
];

export const CPU_ID = 'cpu';

export interface RoomConfig {
  game: GameId;
  mode: GameMode;
  rounds: number;
  secondsPerRound: number;
  maxGuesses: number;
  maxPlayers: number;
  visibility: 'private' | 'open';
}

export const DEFAULT_CONFIG: RoomConfig = {
  game: 'wordbattle',
  mode: 'race',
  rounds: 3,
  secondsPerRound: 120,
  maxGuesses: 6,
  maxPlayers: 2,
  visibility: 'private',
};

export const CONFIG_LIMITS = {
  rounds: [1, 3, 5, 7],
  secondsPerRound: [0, 60, 90, 120, 180],
  maxGuesses: [4, 5, 6, 7],
  maxPlayers: [2, 3, 4],
} as const;

export const SOLO_CONFIG: RoomConfig = {
  game: 'wordbattle',
  mode: 'solo',
  rounds: 1,
  secondsPerRound: 0,
  maxGuesses: 6,
  maxPlayers: 1,
  visibility: 'private',
};

export const TICTACTOE_CONFIG: RoomConfig = {
  game: 'tictactoe',
  mode: 'race',
  rounds: 3,
  secondsPerRound: 60,
  maxGuesses: 0,
  maxPlayers: 2,
  visibility: 'private',
};

export const TICTACTOE_SOLO_CONFIG: RoomConfig = {
  ...TICTACTOE_CONFIG,
  mode: 'solo',
  maxPlayers: 1,
};

export const DAILY_CONFIG: RoomConfig = {
  game: 'wordbattle',
  mode: 'daily',
  rounds: 1,
  secondsPerRound: 0,
  maxGuesses: 6,
  maxPlayers: 1,
  visibility: 'private',
};

export const ANAGRAM_CONFIG: RoomConfig = {
  game: 'anagram',
  mode: 'race',
  rounds: 3,
  secondsPerRound: 60,
  maxGuesses: 0,
  maxPlayers: 4,
  visibility: 'private',
};

export const ANAGRAM_MIN_LENGTH = 3;

export const MAX_HINTS = 2;

export const ROOM_CODE_LENGTH = 5;
export const MAX_ROOM_PLAYERS = 4;

export const AVATAR_IDS = [
  'ember',
  'moss',
  'tide',
  'plum',
  'rust',
  'sand',
  'slate',
  'mint',
  'berry',
  'ink',
  'lime',
  'dusk',
] as const;

export const DEFAULT_AVATAR_ID = AVATAR_IDS[0];

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
}

export interface HintReveal {
  index: number;
  letter: string;
}

export interface OwnGuess {
  word: string;
  tiles: Tile[];
}

export interface MaskedGuess {
  tiles: Tile[];
}

export interface PlayerView {
  profile: PlayerProfile;
  connected: boolean;
  ready: boolean;
  score: number;
  guesses: OwnGuess[] | null;
  resigned: boolean;
  maskedGuesses: MaskedGuess[];
  keyboard: Record<string, Tile> | null;
  solved: boolean;
  solveMs: number | null;
  outOfGuesses: boolean;
  place: number | null;
  hints: HintReveal[] | null;
}

export interface RevealedBoard {
  playerId: string;
  guesses: OwnGuess[];
  solved: boolean;
  solveMs: number | null;
  hints: number;
}

export interface RoundSummary {
  round: number;
  answer: string;
  winnerId: string | null;
  draw: boolean;
  boards: RevealedBoard[];
  ttt?: { board: (string | null)[]; line: number[] | null };
  pool?: string;
}

export interface FoundWord {
  word: string;
  points: number;
}

export interface AnagramState {
  pool: string[];
  found: FoundWord[] | null;
  counts: Record<string, number>;
  best: number;
}

export interface TicTacToeState {
  board: (string | null)[];
  marks: Record<string, 'X' | 'O'>;
  turnId: string | null;
  winningLine: number[] | null;
  lastMove: number | null;
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
  history: RoundSummary[];
  answer: string | null;
  matchWinnerId: string | null;
  matchDraw: boolean;
  votekicks: VoteKick[];
  joinRequests: JoinRequest[];
  watchers: number;
  spectating: boolean;
  ttt: TicTacToeState | null;
  anagram: AnagramState | null;
}

export type TournamentPhase = 'lobby' | 'running' | 'finished';

export interface BracketSeat {
  userId: string | null;
  name: string;
  avatar: string;
}

export interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  seats: [BracketSeat | null, BracketSeat | null];
  winnerId: string | null;
  roomCode: string | null;
  done: boolean;
}

export interface TournamentState {
  code: string;
  hostId: string;
  game: GameId;
  size: number;
  phase: TournamentPhase;
  players: BracketSeat[];
  rounds: BracketMatch[][];
  championId: string | null;
}

export const TOURNAMENT_SIZES = [4, 8] as const;

export interface JoinRequest {
  userId: string;
  name: string;
  avatar: string;
  requestedAt: number;
}

export interface Sanction {
  kind: 'warn' | 'ban';
  reason: string;
  until: number | null;
}

export interface VoteKick {
  targetId: string;
  targetName: string;
  votes: string[];
  required: number;
  expiresAt: number;
}

export interface OpenRoom {
  code: string;
  game: GameId;
  hostName: string;
  players: number;
  maxPlayers: number;
  rounds: number;
  secondsPerRound: number;
}

export const VOTEKICK_MS = 45_000;

export type PresenceStatus = 'offline' | 'online' | 'playing';

export interface PresenceEntry {
  userId: string;
  status: PresenceStatus;
  roomCode: string | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  text: string;
  at: number;
  flagged: boolean;
  system: boolean;
}

export interface GameInvite {
  fromId: string;
  fromName: string;
  fromAvatar: string;
  code: string;
  mode: GameMode;
  game: GameId;
}

export const CHAT_LIMIT = 200;
export const CHAT_HISTORY = 50;

export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ClientToServerEvents {
  'room:create': (config: Partial<RoomConfig>, ack: (res: Ack<{ code: string }>) => void) => void;
  'room:solo': (config: Partial<RoomConfig>, ack: (res: Ack<{ code: string }>) => void) => void;
  'room:daily': (ack: (res: Ack<{ code: string; day: string }>) => void) => void;
  'game:hint': (ack: (res: Ack<HintReveal>) => void) => void;
  'presence:watch': (userIds: string[], ack: (res: Ack<PresenceEntry[]>) => void) => void;
  'presence:ping': (ack: (res: Ack<null>) => void) => void;
  'invite:send': (toUserId: string, ack: (res: Ack<null>) => void) => void;
  'chat:send': (text: string, ack: (res: Ack<null>) => void) => void;
  'room:quickmatch': (
    game: GameId,
    ack: (res: Ack<{ code: string; waiting: boolean }>) => void,
  ) => void;
  'room:cancelQuickmatch': (ack: (res: Ack<null>) => void) => void;
  'room:votekick': (targetId: string, ack: (res: Ack<null>) => void) => void;
  'room:remove': (targetId: string, ack: (res: Ack<null>) => void) => void;
  'game:skip': (ack: (res: Ack<null>) => void) => void;
  'game:move': (index: number, ack: (res: Ack<null>) => void) => void;
  'game:word': (word: string, ack: (res: Ack<FoundWord>) => void) => void;
  'room:join': (
    code: string,
    ack: (res: Ack<{ code: string; pending?: boolean }>) => void,
  ) => void;
  'room:watch': (code: string, ack: (res: Ack<{ code: string }>) => void) => void;
  'tournament:create': (
    payload: { game: GameId; size: number },
    ack: (res: Ack<{ code: string }>) => void,
  ) => void;
  'tournament:join': (code: string, ack: (res: Ack<{ code: string }>) => void) => void;
  'tournament:leave': (ack: (res: Ack<null>) => void) => void;
  'tournament:start': (ack: (res: Ack<null>) => void) => void;
  'tournament:watch': (code: string, ack: (res: Ack<TournamentState>) => void) => void;
  'room:unwatch': (ack: (res: Ack<null>) => void) => void;
  'room:respondJoin': (
    payload: { userId: string; accept: boolean },
    ack: (res: Ack<null>) => void,
  ) => void;
  'room:leave': (ack: (res: Ack<null>) => void) => void;
  'room:ready': (ready: boolean, ack: (res: Ack<null>) => void) => void;
  'room:config': (config: Partial<RoomConfig>, ack: (res: Ack<null>) => void) => void;
  'room:rematch': (ack: (res: Ack<null>) => void) => void;
  'game:guess': (word: string, ack: (res: Ack<null>) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:closed': (reason: string) => void;
  'game:roundStart': (round: number) => void;
  'game:roundEnd': (summary: RoundSummary) => void;
  'game:matchEnd': (state: RoomState) => void;
  'game:opponentGuessed': (playerId: string) => void;
  'presence:update': (entry: PresenceEntry) => void;
  'invite:received': (invite: GameInvite) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:history': (messages: ChatMessage[]) => void;
  'session:replaced': () => void;
  'room:removed': (reason: string) => void;
  'queue:matched': (code: string) => void;
  'room:joinRequest': (request: JoinRequest) => void;
  'room:joinResponse': (payload: { code: string; accepted: boolean }) => void;
  'sanction:notice': (sanction: Sanction) => void;
  'room:resume': (payload: { code: string; phase: RoomPhase }) => void;
  'tournament:state': (state: TournamentState) => void;
  'tournament:closed': (reason: string) => void;
  toast: (payload: { kind: 'info' | 'error' | 'success'; message: string }) => void;
}

export interface SocketData {
  profile: PlayerProfile | null;
  roomCode: string | null;
  watching: string | null;
}
