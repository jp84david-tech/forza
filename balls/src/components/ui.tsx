import { ChevronLeft, ChevronRight, CircleAlert, Minus, Plus, RefreshCw, Star, StarHalf, WifiOff } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react';
import { cx, money } from '../lib/format';
import { nav } from '../state/nav';

/** Core UI primitives shared by every screen. */

// ---------------------------------------------------------------- buttons

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'night' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', block, loading, icon, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', loading && 'is-loading', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children && <span className="btn__label">{children}</span>}
    </button>
  );
}

export function IconButton({ label, children, className, variant = 'plain', badge, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: 'plain' | 'glass' | 'soft'; badge?: number }) {
  return (
    <button type="button" className={cx('iconbtn', `iconbtn--${variant}`, className)} aria-label={label} title={label} {...rest}>
      {children}
      {!!badge && <span className="iconbtn__badge" aria-label={`${badge} unread`}>{badge > 9 ? '9+' : badge}</span>}
    </button>
  );
}

export function BackButton({ variant = 'plain', onClick }: { variant?: 'plain' | 'glass'; onClick?: () => void }) {
  return (
    <IconButton label="Back" variant={variant} onClick={onClick ?? (() => nav.pop())}>
      <ChevronLeft size={24} strokeWidth={2.2} />
    </IconButton>
  );
}

// ---------------------------------------------------------------- chips & segmented

export function Chip({ active, children, icon, onClick, className, count, ...rest }: { active?: boolean; children: ReactNode; icon?: ReactNode; onClick?: () => void; className?: string; count?: number } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  return (
    <button type="button" className={cx('chip', active && 'chip--active', className)} aria-pressed={active} onClick={onClick} {...rest}>
      {icon}
      <span>{children}</span>
      {count != null && count > 0 && <span className="chip__count">{count}</span>}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: { value: T; options: Array<{ value: T; label: ReactNode; count?: number }>; onChange: (v: T) => void; label: string; className?: string }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={cx('seg', className)} role="tablist" aria-label={label} style={{ ['--n' as string]: options.length, ['--i' as string]: idx }}>
      <span className="seg__thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={cx('seg__opt', o.value === value && 'is-active')} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && o.count > 0 && <span className="seg__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- display

export function Pill({ tone = 'neutral', children, icon, className }: { tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'night' | 'glass'; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span className={cx('pill', `pill--${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}

export function Avatar({ name, color, photo, size = 40, ring }: { name: string; color: string; photo?: string; size?: number; ring?: boolean }) {
  const initials = name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span className={cx('avatar', ring && 'avatar--ring')} style={{ width: size, height: size, background: color, fontSize: size * 0.38 }} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initials}
    </span>
  );
}

export function AvatarStack({ people, max = 5, size = 28 }: { people: Array<{ id: string; name: string; color: string; photo?: string }>; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="avstack" aria-hidden="true">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} color={p.color} photo={p.photo} size={size} ring />
      ))}
      {extra > 0 && (
        <span className="avatar avatar--ring avatar--more" style={{ width: size, height: size, fontSize: size * 0.36 }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

/** Rating as a star icon + number, or as five stars. */
export function RatingDisplay({ value, count, variant = 'compact', size = 14 }: { value: number; count?: number; variant?: 'compact' | 'stars'; size?: number }) {
  if (variant === 'stars') {
    return (
      <span className="stars" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) =>
          value >= i - 0.25 ? (
            <Star key={i} size={size} className="star is-on" fill="currentColor" strokeWidth={0} />
          ) : value >= i - 0.75 ? (
            <span key={i} className="star-half">
              <Star size={size} className="star" fill="currentColor" strokeWidth={0} />
              <StarHalf size={size} className="star is-on" fill="currentColor" strokeWidth={0} />
            </span>
          ) : (
            <Star key={i} size={size} className="star" fill="currentColor" strokeWidth={0} />
          ),
        )}
      </span>
    );
  }
  return (
    <span className="rating" aria-label={`Rated ${value.toFixed(1)} out of 5${count != null ? ` from ${count} reviews` : ''}`}>
      <Star size={size} fill="currentColor" strokeWidth={0} className="rating__star" aria-hidden="true" />
      <b>{value.toFixed(1)}</b>
      {count != null && <span className="rating__count">({count})</span>}
    </span>
  );
}

/** Price with an optional unit: "£40 /hr", "from £8", "Free". */
export function PriceDisplay({ pence, unit, from, size = 'md', className }: { pence: number; unit?: string; from?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  if (pence === 0) return <span className={cx('price', `price--${size}`, 'price--free', className)}>Free</span>;
  return (
    <span className={cx('price', `price--${size}`, className)}>
      {from && <span className="price__from">from </span>}
      <b>{money(pence)}</b>
      {unit && <span className="price__unit">{unit}</span>}
    </span>
  );
}

export function Section({ title, action, onAction, children, className, id, eyebrow }: { title?: ReactNode; action?: string; onAction?: () => void; children: ReactNode; className?: string; id?: string; eyebrow?: string }) {
  return (
    <section className={cx('section', className)} aria-labelledby={id}>
      {(title || action) && (
        <div className="section__head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && (
              <h2 className="section__title" id={id}>
                {title}
              </h2>
            )}
          </div>
          {action && (
            <button type="button" className="link" onClick={onAction}>
              {action}
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Row({ icon, title, subtitle, trailing, onClick, chevron = !!onClick, danger, className }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; onClick?: () => void; chevron?: boolean; danger?: boolean; className?: string }) {
  const body = (
    <>
      {icon && <span className="row__icon">{icon}</span>}
      <span className="row__body">
        <span className="row__title">{title}</span>
        {subtitle && <span className="row__sub">{subtitle}</span>}
      </span>
      {trailing && <span className="row__trail">{trailing}</span>}
      {chevron && <ChevronRight size={18} className="row__chev" aria-hidden="true" />}
    </>
  );
  return onClick ? (
    <button type="button" className={cx('row', 'row--btn', danger && 'row--danger', className)} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cx('row', className)}>{body}</div>
  );
}

// ---------------------------------------------------------------- form controls

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} aria-label={label} className={cx('switch', checked && 'is-on')} onClick={() => onChange(!checked)}>
      <span className="switch__knob" />
    </button>
  );
}

export function Stepper({ value, min, max, onChange, label, format }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string; format?: (v: number) => ReactNode }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Minus size={18} />
      </button>
      <output className="stepper__value" aria-live="polite">
        {format ? format(value) : value}
      </output>
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor, optional }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; optional?: boolean }) {
  return (
    <div className={cx('field', error && 'has-error')}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="field__opt"> · optional</span>}
      </label>
      {children}
      {error ? (
        <p className="field__error" role="alert">
          <CircleAlert size={14} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- states

export function Skeleton({ w, h = 14, r = 8, className }: { w?: number | string; h?: number | string; r?: number; className?: string }) {
  return <span className={cx('skeleton', className)} style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />;
}

export function SkeletonCard({ variant = 'row' }: { variant?: 'row' | 'wide' | 'tile' }) {
  if (variant === 'wide')
    return (
      <div className="skel-wide" aria-hidden="true">
        <Skeleton h={150} r={18} w="100%" />
        <Skeleton w="70%" h={16} />
        <Skeleton w="45%" h={12} />
      </div>
    );
  if (variant === 'tile')
    return (
      <div className="skel-tile" aria-hidden="true">
        <Skeleton w="60%" h={14} />
        <Skeleton w="85%" h={20} />
        <Skeleton w="50%" h={12} />
        <Skeleton w="100%" h={36} r={12} />
      </div>
    );
  return (
    <div className="skel-row" aria-hidden="true">
      <Skeleton w={92} h={92} r={14} />
      <div className="skel-row__lines">
        <Skeleton w="75%" h={16} />
        <Skeleton w="50%" h={12} />
        <Skeleton w="35%" h={12} />
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action, secondary, compact }: { icon: ReactNode; title: string; body?: string; action?: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void }; compact?: boolean }) {
  return (
    <div className={cx('empty', compact && 'empty--compact')}>
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="empty__title">{title}</h3>
      {body && <p className="empty__body">{body}</p>}
      {(action || secondary) && (
        <div className="empty__actions">
          {action && (
            <Button size="md" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondary && (
            <Button size="md" variant="ghost" onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ onRetry, title = 'Something went wrong.', body = 'Please try again.', offline }: { onRetry: () => void; title?: string; body?: string; offline?: boolean }) {
  return (
    <div className="empty empty--error" role="alert">
      <span className="empty__icon" aria-hidden="true">
        {offline ? <WifiOff size={26} /> : <CircleAlert size={26} />}
      </span>
      <h3 className="empty__title">{title}</h3>
      <p className="empty__body">{body}</p>
      <div className="empty__actions">
        <Button icon={<RefreshCw size={16} />} onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- screen scaffold

/** Tracks whether a scroll container has scrolled past a threshold. */
export function useScrolled(ref: React.RefObject<HTMLElement | null>, threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setScrolled(el.scrollTop > threshold);
    on();
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [ref, threshold]);
  return scrolled;
}

export interface ScreenProps {
  title?: ReactNode;
  /** 'large' for tab roots, 'standard' for pushed screens, 'overlay' floats over a hero image. */
  header?: 'large' | 'standard' | 'overlay' | 'none';
  back?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  leading?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  overlayThreshold?: number;
  subtitle?: ReactNode;
  retap?: number;
}

export function Screen({ title, header = 'standard', back = true, onBack, actions, leading, footer, children, className, scrollRef, overlayThreshold = 200, subtitle, retap }: ScreenProps) {
  const own = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? own;
  const scrolled = useScrolled(ref, header === 'overlay' ? overlayThreshold : header === 'large' ? 36 : 4);

  useEffect(() => {
    if (retap) ref.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [retap, ref]);

  return (
    <div className={cx('screen-inner', `hdr-${header}`, !!footer && 'has-footer', className)}>
      {header !== 'none' && (
        <header className={cx('topbar', scrolled && 'is-scrolled')}>
          <div className="topbar__lead">
            {leading ?? (back && <BackButton variant={header === 'overlay' && !scrolled ? 'glass' : 'plain'} onClick={onBack} />)}
          </div>
          <div className="topbar__title" aria-hidden={header === 'large' && !scrolled}>
            {typeof title === 'string' ? <span>{title}</span> : title}
            {subtitle && header === 'standard' && <small>{subtitle}</small>}
          </div>
          <div className="topbar__actions">{actions}</div>
        </header>
      )}
      <div className="scroll" ref={ref}>
        {header === 'large' && title && (
          <div className="largetitle">
            <h1>{title}</h1>
          </div>
        )}
        {children}
      </div>
      {footer && <div className="footer-bar">{footer}</div>}
    </div>
  );
}

/** A labelled sticky summary + primary action for flow screens. */
export function CtaBar({ label, sub, children }: { label?: ReactNode; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="cta">
      {(label || sub) && (
        <div className="cta__text">
          {label && <div className="cta__label">{label}</div>}
          {sub && <div className="cta__sub">{sub}</div>}
        </div>
      )}
      <div className="cta__action">{children}</div>
    </div>
  );
}

export function Divider() {
  return <hr className="divider" />;
}
