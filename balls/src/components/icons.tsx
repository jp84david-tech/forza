import type { SVGProps } from 'react';
import type { SportId } from '../data/types';

/**
 * Sport glyphs drawn on the same 24px grid and stroke as the UI icon set
 * (lucide), so sport and interface icons sit together naturally.
 */
type P = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };

function Glyph({ size = 20, strokeWidth = 1.8, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

const Football = (p: P) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8.3l3.4 2.5-1.3 4H9.9l-1.3-4z" />
    <path d="M12 8.3V3.2M15.4 10.8l4.8-1.6M14.1 14.8l3 4.1M9.9 14.8l-3 4.1M8.6 10.8L3.8 9.2" />
  </Glyph>
);

const Basketball = (p: P) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18M3 12h18" />
    <path d="M5.7 5.6c2.5 2.6 2.5 10.2 0 12.8M18.3 5.6c-2.5 2.6-2.5 10.2 0 12.8" />
  </Glyph>
);

const Tennis = (p: P) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.2 5.9c2.6 1.7 4 3.8 4 6.1s-1.4 4.4-4 6.1M18.8 5.9c-2.6 1.7-4 3.8-4 6.1s1.4 4.4 4 6.1" />
  </Glyph>
);

const Padel = (p: P) => (
  <Glyph {...p}>
    <path d="M13.9 13.6c-2.6 2.6-6.4 3-8.5.9s-1.7-5.9.9-8.5 6.4-3 8.5-.9 1.7 5.9-.9 8.5z" />
    <path d="M13.9 13.6l5.6 5.6" strokeWidth={(p.strokeWidth ?? 1.8) * 1.4} />
    <circle cx="8.3" cy="8.4" r=".6" fill="currentColor" stroke="none" />
    <circle cx="10.6" cy="7.6" r=".6" fill="currentColor" stroke="none" />
    <circle cx="11.6" cy="10.6" r=".6" fill="currentColor" stroke="none" />
    <circle cx="9.1" cy="11.2" r=".6" fill="currentColor" stroke="none" />
    <circle cx="19.4" cy="5.2" r="1.7" />
  </Glyph>
);

const Badminton = (p: P) => (
  <Glyph {...p}>
    <circle cx="6.8" cy="17.2" r="2.8" />
    <path d="M8.8 15.2L13 3.8M8.8 15.2l11.4-4.2M8.8 15.2l7.3-9.5M8.8 15.2l9.5-7.3" />
    <path d="M13 3.8c3.1.5 6.7 4.1 7.2 7.2" />
  </Glyph>
);

const Volleyball = (p: P) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 12c0-4.2 1.6-7.1 4.2-8.2M12 12c-3.6 2.1-6.9 2.1-9 .3M12 12c3.6 2.1 5.3 5 5 7.9" />
    <path d="M7.6 4.2c2.6 1.3 4.4 4.2 4.4 7.8M20.9 11.4c-2.4 1.8-5.6 2.4-8.9.6" />
  </Glyph>
);

const Cricket = (p: P) => (
  <Glyph {...p}>
    <path d="M15.2 3.4l5.4 5.4-9.6 9.6a1.9 1.9 0 0 1-2.7 0l-2.7-2.7a1.9 1.9 0 0 1 0-2.7z" />
    <path d="M5.6 18.4l-2.4 2.4" strokeWidth={(p.strokeWidth ?? 1.8) * 1.4} />
    <circle cx="18" cy="18.2" r="2.2" />
  </Glyph>
);

const Rugby = (p: P) => (
  <Glyph {...p}>
    <ellipse cx="12" cy="12" rx="10" ry="5.6" transform="rotate(-45 12 12)" />
    <path d="M9.2 14.8l5.6-5.6" />
    <path d="M10 12.6l1.4 1.4M11.3 11.3l1.4 1.4M12.6 10l1.4 1.4" />
  </Glyph>
);

const Running = (p: P) => (
  <Glyph {...p}>
    <circle cx="15.5" cy="4.3" r="1.9" />
    <path d="M13.6 8.2l-2.4 5.1 3.6 2.6-.9 5.3" />
    <path d="M11.2 13.3l-2.1 3.5-4.4.3" />
    <path d="M13.6 8.2l3.2 3 3-.4M13.6 8.2l-3.4-.6-2.4 2.8" />
  </Glyph>
);

const Gym = (p: P) => (
  <Glyph {...p}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Glyph>
);

const Swimming = (p: P) => (
  <Glyph {...p}>
    <circle cx="17.5" cy="7" r="1.9" />
    <path d="M3.5 13l5.3-3.8 3.3 2.6 2.7-1.9" />
    <path d="M2.5 17.3c1.6 0 1.6 1.2 3.2 1.2s1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3-1.2" />
  </Glyph>
);

const Other = (p: P) => (
  <Glyph {...p}>
    <path d="M7 20l3.5-8 4 4.5L18 9" />
    <circle cx="6" cy="6.5" r="1.4" />
    <circle cx="12.5" cy="4.5" r="1.2" />
    <circle cx="18" cy="5" r="1.4" />
    <circle cx="9.5" cy="9.5" r="1" />
    <path d="M3 20h18" />
  </Glyph>
);

const MAP: Record<SportId, (p: P) => React.ReactElement> = {
  football: Football,
  basketball: Basketball,
  tennis: Tennis,
  padel: Padel,
  badminton: Badminton,
  volleyball: Volleyball,
  cricket: Cricket,
  rugby: Rugby,
  running: Running,
  gym: Gym,
  swimming: Swimming,
  other: Other,
};

export function SportIcon({ sport, ...p }: P & { sport: SportId }) {
  const C = MAP[sport] ?? Other;
  return <C {...p} />;
}

/** The BALLS mark: a ball with a single seam that also reads as a map pin swoosh. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--brand)" />
      <path d="M9.6 3.9c4.6 5.6 4.6 18.6 0 24.2M22.4 3.9c-4.6 5.6-4.6 18.6 0 24.2" fill="none" stroke="var(--brand-ink)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-label="BALLS">
      BALLS
    </span>
  );
}
