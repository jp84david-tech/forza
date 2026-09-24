import { type ReactNode, useSyncExternalStore } from 'react';

/** Transient UI: toasts, bottom sheets and dialogs. Not persisted. */

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error';
  icon?: string;
  action?: { label: string; run: () => void };
}

export interface Sheet {
  id: number;
  kind: 'sheet' | 'dialog' | 'viewer';
  label: string;
  render: (close: () => void) => ReactNode;
  closing?: boolean;
}

interface UIState {
  toasts: Toast[];
  sheets: Sheet[];
}

let state: UIState = { toasts: [], sheets: [] };
let seq = 0;
const listeners = new Set<() => void>();
const emit = (next: UIState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const ui = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  toast(message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> = {}) {
    const t: Toast = { id: ++seq, message, tone: opts.tone ?? 'default', icon: opts.icon, action: opts.action };
    emit({ ...state, toasts: [...state.toasts.slice(-2), t] });
    setTimeout(() => ui.dismissToast(t.id), opts.action ? 6000 : 3600);
  },
  dismissToast(id: number) {
    emit({ ...state, toasts: state.toasts.filter((t) => t.id !== id) });
  },
  open(label: string, render: Sheet['render'], kind: Sheet['kind'] = 'sheet'): number {
    const s: Sheet = { id: ++seq, kind, label, render };
    emit({ ...state, sheets: [...state.sheets, s] });
    return s.id;
  },
  /** Animate a sheet out, then remove it. */
  close(id?: number) {
    const target = id ?? state.sheets[state.sheets.length - 1]?.id;
    if (target == null) return;
    emit({ ...state, sheets: state.sheets.map((s) => (s.id === target ? { ...s, closing: true } : s)) });
    setTimeout(() => emit({ ...state, sheets: state.sheets.filter((s) => s.id !== target) }), 240);
  },
  closeAll() {
    emit({ ...state, sheets: [] });
  },
};

export function useUI(): UIState {
  return useSyncExternalStore(ui.subscribe, ui.get, ui.get);
}
