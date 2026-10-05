import { useSyncExternalStore } from 'react';
import { analytics } from '../services/analytics';

/**
 * Installing BALLS as an app.
 * - Chrome, Edge, Samsung Internet and similar fire `beforeinstallprompt`, which
 *   we keep so our own "Install app" button can show the browser's install box.
 * - iPhone and iPad Safari have no install box: people use Share → Add to Home Screen.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  canPrompt: boolean;
  installed: boolean;
}

let deferred: InstallPromptEvent | null = null;
let state: InstallState = { canPrompt: false, installed: isStandalone() };
const listeners = new Set<() => void>();
const emit = (next: Partial<InstallState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit({ canPrompt: false, installed: true });
    analytics.track('app_installed');
  });
}

export function useInstall(): InstallState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state,
    () => state,
  );
}

/** Shows the browser's install box. Returns false when there isn't one (use the instructions instead). */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit({ canPrompt: false });
  await e.prompt();
  const choice = await e.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
  if (choice.outcome === 'accepted') emit({ installed: true });
  return true;
}

/** Offline support. Only on a real web address: it can't work from a downloaded file. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* no sw.js next to this page (e.g. the single-file copy) — the app works without it */
    });
  });
}
