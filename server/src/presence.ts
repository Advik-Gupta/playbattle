import type { PresenceEntry, PresenceStatus } from './protocol.js';

interface Entry {
  sockets: Set<string>;
  status: PresenceStatus;
  roomCode: string | null;
  lastSeen: number;
}

const people = new Map<string, Entry>();
const watchers = new Map<string, Set<string>>();

export function connected(userId: string, socketId: string) {
  const entry = people.get(userId);

  if (entry) {
    entry.sockets.add(socketId);
    entry.status = entry.roomCode ? 'playing' : 'online';
    entry.lastSeen = Date.now();
    return entry;
  }

  const fresh: Entry = {
    sockets: new Set([socketId]),
    status: 'online',
    roomCode: null,
    lastSeen: Date.now(),
  };
  people.set(userId, fresh);
  return fresh;
}

export function disconnected(userId: string, socketId: string) {
  const entry = people.get(userId);
  if (!entry) return;

  entry.sockets.delete(socketId);
  entry.lastSeen = Date.now();

  if (entry.sockets.size === 0) {
    entry.status = 'offline';
    entry.roomCode = null;
  }
}

export function socketsFor(userId: string) {
  return [...(people.get(userId)?.sockets ?? [])];
}

export function setRoom(userId: string, roomCode: string | null) {
  const entry = people.get(userId);
  if (!entry) return;

  entry.roomCode = roomCode;
  entry.status = entry.sockets.size === 0 ? 'offline' : roomCode ? 'playing' : 'online';
  entry.lastSeen = Date.now();
}

export function touch(userId: string) {
  const entry = people.get(userId);
  if (entry) entry.lastSeen = Date.now();
}

export function statusOf(userId: string): PresenceEntry {
  const entry = people.get(userId);

  return {
    userId,
    status: entry?.status ?? 'offline',
    roomCode: entry?.roomCode ?? null,
  };
}

export function watch(watcherId: string, userIds: string[]) {
  for (const list of watchers.values()) list.delete(watcherId);

  for (const target of userIds.slice(0, 200)) {
    const list = watchers.get(target) ?? new Set<string>();
    list.add(watcherId);
    watchers.set(target, list);
  }

  return userIds.map(statusOf);
}

export function unwatch(watcherId: string) {
  for (const list of watchers.values()) list.delete(watcherId);
}

export function watchersOf(userId: string) {
  return [...(watchers.get(userId) ?? [])];
}
