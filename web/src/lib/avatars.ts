export interface AvatarPreset {
  id: string;
  name: string;
  bg: string;
  fg: string;
  shape: 'circle' | 'square' | 'diamond' | 'triangle' | 'cross' | 'rings';
}

import { AVATAR_IDS } from '@/lib/protocol';

export const AVATARS: AvatarPreset[] = [
  { id: 'ember', name: 'Ember', bg: '#f97316', fg: '#fff7ed', shape: 'circle' },
  { id: 'moss', name: 'Moss', bg: '#16a34a', fg: '#f0fdf4', shape: 'square' },
  { id: 'tide', name: 'Tide', bg: '#0ea5e9', fg: '#f0f9ff', shape: 'diamond' },
  { id: 'plum', name: 'Plum', bg: '#a855f7', fg: '#faf5ff', shape: 'triangle' },
  { id: 'rust', name: 'Rust', bg: '#b91c1c', fg: '#fef2f2', shape: 'cross' },
  { id: 'sand', name: 'Sand', bg: '#d97706', fg: '#fffbeb', shape: 'rings' },
  { id: 'slate', name: 'Slate', bg: '#475569', fg: '#f8fafc', shape: 'circle' },
  { id: 'mint', name: 'Mint', bg: '#14b8a6', fg: '#f0fdfa', shape: 'square' },
  { id: 'berry', name: 'Berry', bg: '#db2777', fg: '#fdf2f8', shape: 'diamond' },
  { id: 'ink', name: 'Ink', bg: '#1e293b', fg: '#e2e8f0', shape: 'triangle' },
  { id: 'lime', name: 'Lime', bg: '#65a30d', fg: '#f7fee7', shape: 'cross' },
  { id: 'dusk', name: 'Dusk', bg: '#4f46e5', fg: '#eef2ff', shape: 'rings' },
];

export const DEFAULT_AVATAR = AVATARS[0].id;

export const KNOWN_IDS: readonly string[] = AVATAR_IDS;

export function avatarFor(id: string | undefined | null): AvatarPreset {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}

export function isAvatarId(id: string): boolean {
  return KNOWN_IDS.includes(id);
}
