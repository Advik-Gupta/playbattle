const KEY = 'playbattle-notifications';

export type NotifyChoice = 'on' | 'off' | 'unset';

export function readChoice(): NotifyChoice {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === 'on' || stored === 'off' ? stored : 'unset';
  } catch {
    return 'unset';
  }
}

export function writeChoice(choice: NotifyChoice) {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    return;
  }
}

export function supported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission(): NotificationPermission | 'unsupported' {
  return supported() ? Notification.permission : 'unsupported';
}

export async function request(): Promise<boolean> {
  if (!supported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notify(title: string, body: string) {
  if (!supported()) return;
  if (Notification.permission !== 'granted') return;
  if (readChoice() !== 'on') return;
  if (typeof document !== 'undefined' && !document.hidden) return;

  try {
    const note = new Notification(title, { body, icon: '/icon.svg', tag: 'playbattle' });
    setTimeout(() => note.close(), 8000);
  } catch {
    return;
  }
}
