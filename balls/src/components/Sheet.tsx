import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { cx } from '../lib/format';
import { type Sheet, ui, useUI } from '../state/ui';
import { Button, IconButton } from './ui';

/**
 * BottomSheet / Modal host. Sheets are opened imperatively with `ui.open`,
 * slide up from the bottom, can be dragged down to dismiss, trap Escape and
 * return focus to whatever opened them.
 */

function SheetFrame({ sheet, top }: { sheet: Sheet; top: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const drag = useRef<{ y0: number; dy: number; active: boolean }>({ y0: 0, dy: 0, active: false });
  const close = () => ui.close(sheet.id);

  useEffect(() => {
    opener.current = document.activeElement;
    const t = setTimeout(() => panel.current?.focus({ preventScroll: true }), 30);
    return () => {
      clearTimeout(t);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!top) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top]);

  const onDown = (e: React.PointerEvent) => {
    if (sheet.kind !== 'sheet') return;
    const target = e.target as HTMLElement;
    const scroller = target.closest('.sheet__body');
    if (scroller && scroller.scrollTop > 0) return;
    if (target.closest('input,textarea,select,button,[role=slider],a')) return;
    drag.current = { y0: e.clientY, dy: 0, active: true };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.active || !panel.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y0);
    drag.current.dy = dy;
    if (dy > 4) {
      panel.current.style.transition = 'none';
      panel.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onUp = () => {
    if (!drag.current.active || !panel.current) return;
    drag.current.active = false;
    panel.current.style.transition = '';
    if (drag.current.dy > 110) close();
    else panel.current.style.transform = '';
  };

  return (
    <div className={cx('layer', `layer--${sheet.kind}`, sheet.closing && 'is-closing')}>
      <div className="layer__scrim" onClick={close} aria-hidden="true" />
      <div
        ref={panel}
        className={cx(sheet.kind === 'sheet' ? 'sheet' : sheet.kind === 'dialog' ? 'dialog' : 'viewer')}
        role="dialog"
        aria-modal="true"
        aria-label={sheet.label}
        tabIndex={-1}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {sheet.kind === 'sheet' && <div className="sheet__handle" aria-hidden="true" />}
        {sheet.render(close)}
      </div>
    </div>
  );
}

export function SheetHost() {
  const { sheets } = useUI();
  return (
    <>
      {sheets.map((s, i) => (
        <SheetFrame key={s.id} sheet={s} top={i === sheets.length - 1} />
      ))}
    </>
  );
}

export function SheetHeader({ title, subtitle, onClose, leading }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; leading?: ReactNode }) {
  return (
    <div className="sheet__header">
      {leading}
      <div className="sheet__titles">
        <h2 className="sheet__title">{title}</h2>
        {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
      </div>
      <IconButton label="Close" variant="soft" onClick={onClose}>
        <X size={18} />
      </IconButton>
    </div>
  );
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('sheet__body', className)}>{children}</div>;
}

export function SheetFooter({ children }: { children: ReactNode }) {
  return <div className="sheet__footer">{children}</div>;
}

/** Promise-based confirmation dialog (the viewer blocks window.confirm). */
export function confirmDialog(opts: { title: string; body?: ReactNode; confirm: string; cancel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean, close: () => void) => {
      if (done) return;
      done = true;
      resolve(v);
      close();
    };
    ui.open(
      opts.title,
      (close) => (
        <div className="dialog__inner">
          <h2 className="dialog__title">{opts.title}</h2>
          {opts.body && <div className="dialog__body">{opts.body}</div>}
          <div className="dialog__actions">
            <Button variant="secondary" block onClick={() => finish(false, close)}>
              {opts.cancel ?? 'Cancel'}
            </Button>
            <Button variant={opts.danger ? 'danger' : 'primary'} block onClick={() => finish(true, close)}>
              {opts.confirm}
            </Button>
          </div>
        </div>
      ),
      'dialog',
    );
  });
}

export function ToastHost() {
  const { toasts } = useUI();
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', `toast--${t.tone}`)} role="status">
          <span className="toast__msg">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action!.run();
                ui.dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
