const KEY = 'playbattle-sound';

type Tone = 'key' | 'submit' | 'correct' | 'wrong' | 'win' | 'lose' | 'tick';

const TONES: Record<Tone, { freq: number; length: number; type: OscillatorType }> = {
  key: { freq: 320, length: 0.04, type: 'sine' },
  submit: { freq: 460, length: 0.07, type: 'triangle' },
  correct: { freq: 660, length: 0.16, type: 'sine' },
  wrong: { freq: 180, length: 0.18, type: 'sawtooth' },
  win: { freq: 880, length: 0.32, type: 'sine' },
  lose: { freq: 140, length: 0.34, type: 'sine' },
  tick: { freq: 540, length: 0.03, type: 'square' },
};

let context: AudioContext | null = null;

export function soundOn() {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    return;
  }
}

function audio() {
  if (typeof window === 'undefined') return null;

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  context ??= new Ctor();
  if (context.state === 'suspended') void context.resume();

  return context;
}

export function play(tone: Tone) {
  if (!soundOn()) return;

  const ctx = audio();
  if (!ctx) return;

  const settings = TONES[tone];
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = settings.type;
  oscillator.frequency.value = settings.freq;

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + settings.length);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + settings.length + 0.02);
}
