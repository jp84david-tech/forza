import { memo, useId, type ReactNode } from 'react';
import type { ArtSpec } from '../data/types';
import { rng } from '../lib/rng';

/**
 * Generated venue imagery: top-down "drone shots" of pitches and courts, plus
 * simple scenes for changing rooms, entrances and cafés. Each image is drawn
 * from a seed so it never changes between visits. In production these are
 * replaced by the venue's own photos; the component API stays the same.
 */

const W = 400;
const H = 260;

type R = () => number;

interface Ctx {
  r: R;
  id: string;
}

const line = { stroke: 'rgba(255,255,255,0.92)', fill: 'none', strokeWidth: 2.2 } as const;

function Players({ r, n, x, y, w, h, colors }: { r: R; n: number; x: number; y: number; w: number; h: number; colors: string[] }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const c = colors[i % colors.length];
    const rot = r() * 360;
    out.push(
      <g key={i} transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${rot.toFixed(0)})`}>
        <ellipse cx="3" cy="4" rx="7.5" ry="4.8" fill="rgba(0,0,0,0.28)" />
        <ellipse cx="0" cy="0" rx="7" ry="4.4" fill={c} />
        <circle cx="0" cy="0" r="3.1" fill="#3b2a22" />
      </g>,
    );
  }
  return <g>{out}</g>;
}

function Stripes({ x, y, w, h, n, a, b, vertical = true }: { x: number; y: number; w: number; h: number; n: number; a: string; b: string; vertical?: boolean }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      vertical ? (
        <rect key={i} x={x + (i * w) / n} y={y} width={w / n + 0.5} height={h} fill={i % 2 ? a : b} />
      ) : (
        <rect key={i} x={x} y={y + (i * h) / n} width={w} height={h / n + 0.5} fill={i % 2 ? a : b} />
      ),
    );
  }
  return <g>{out}</g>;
}

// ---------------------------------------------------------------- sports

function Football({ r, variant }: Ctx & { variant?: string }) {
  const cage = variant === 'cage';
  const x = 30;
  const y = 30;
  const w = 340;
  const h = 200;
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill={cage ? '#1d2622' : '#2f6b3b'} />
      {!cage && <Stripes x={-60} y={-60} w={W + 120} h={H + 120} n={16} a="#2c6538" b="#31703e" />}
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill={cage ? '#2b4a36' : '#3a8a47'} />
      <Stripes x={x} y={y} w={w} h={h} n={12} a="#3b8e48" b="#43994f" />
      <g {...line}>
        <rect x={x} y={y} width={w} height={h} />
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />
        <circle cx={x + w / 2} cy={y + h / 2} r="30" />
        <rect x={x} y={y + h / 2 - 55} width="52" height="110" />
        <rect x={x + w - 52} y={y + h / 2 - 55} width="52" height="110" />
        <rect x={x} y={y + h / 2 - 25} width="18" height="50" />
        <rect x={x + w - 18} y={y + h / 2 - 25} width="18" height="50" />
        <path d={`M${x + 52} ${y + h / 2 - 18} a 22 22 0 0 1 0 36`} />
        <path d={`M${x + w - 52} ${y + h / 2 - 18} a 22 22 0 0 0 0 36`} />
      </g>
      <circle cx={x + w / 2} cy={y + h / 2} r="2.6" fill="#fff" />
      <rect x={x - 7} y={y + h / 2 - 14} width="7" height="28" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x={x + w} y={y + h / 2 - 14} width="7" height="28" fill="none" stroke="#fff" strokeWidth="2" />
      {cage && (
        <g stroke="rgba(210,225,215,0.35)" strokeWidth="1">
          {Array.from({ length: 40 }, (_, i) => (
            <line key={i} x1={-40 + i * 12} y1={y - 16} x2={-40 + i * 12 + 16} y2={y - 4} />
          ))}
          {Array.from({ length: 40 }, (_, i) => (
            <line key={`b${i}`} x1={-40 + i * 12} y1={y + h + 4} x2={-40 + i * 12 + 16} y2={y + h + 16} />
          ))}
        </g>
      )}
      <Players r={r} n={10} x={x + 30} y={y + 25} w={w - 60} h={h - 50} colors={['#ff6b1a', '#f5f5f0']} />
      <circle cx={x + w * (0.35 + r() * 0.3)} cy={y + h * (0.3 + r() * 0.4)} r="3" fill="#fff" stroke="#222" strokeWidth=".8" />
    </g>
  );
}

function Basketball({ r, variant }: Ctx & { variant?: string }) {
  const wood = variant === 'hardwood';
  const park = variant === 'park';
  const x = 40;
  const y = 35;
  const w = 320;
  const h = 190;
  const court = wood ? '#d09a5c' : park ? '#3f8a5f' : '#2a62d4';
  const key = wood ? '#2f3cf4' : park ? '#2d5f9c' : '#e4572e';
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill={wood ? '#b98049' : park ? '#6d7566' : '#3b404b'} />
      {wood && (
        <g>
          {Array.from({ length: 40 }, (_, i) => (
            <rect key={i} x="-60" y={-60 + i * 10} width={W + 120} height="10" fill={i % 3 === 0 ? '#c68e52' : i % 3 === 1 ? '#cc955a' : '#c28a4f'} />
          ))}
        </g>
      )}
      <rect x={x} y={y} width={w} height={h} fill={court} />
      <rect x={x} y={y + h / 2 - 32} width="70" height="64" fill={key} />
      <rect x={x + w - 70} y={y + h / 2 - 32} width="70" height="64" fill={key} />
      <circle cx={x + w / 2} cy={y + h / 2} r="24" fill={key} />
      <g {...line}>
        <rect x={x} y={y} width={w} height={h} />
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />
        <circle cx={x + w / 2} cy={y + h / 2} r="24" />
        <rect x={x} y={y + h / 2 - 32} width="70" height="64" />
        <rect x={x + w - 70} y={y + h / 2 - 32} width="70" height="64" />
        <path d={`M${x} ${y + 14} h28 a 82 82 0 0 1 0 ${h - 28} h-28`} />
        <path d={`M${x + w} ${y + 14} h-28 a 82 82 0 0 0 0 ${h - 28} h28`} />
        <path d={`M${x + 70} ${y + h / 2 - 22} a 22 22 0 0 1 0 44`} />
        <path d={`M${x + w - 70} ${y + h / 2 - 22} a 22 22 0 0 0 0 44`} />
      </g>
      <g>
        <rect x={x + 8} y={y + h / 2 - 14} width="3" height="28" fill="#f4f4f4" />
        <circle cx={x + 19} cy={y + h / 2} r="6" fill="none" stroke="#ff6a1a" strokeWidth="2.2" />
        <rect x={x + w - 11} y={y + h / 2 - 14} width="3" height="28" fill="#f4f4f4" />
        <circle cx={x + w - 19} cy={y + h / 2} r="6" fill="none" stroke="#ff6a1a" strokeWidth="2.2" />
      </g>
      <Players r={r} n={8} x={x + 40} y={y + 25} w={w - 80} h={h - 50} colors={['#1b1d26', '#f5f5f0']} />
      <circle cx={x + w * (0.3 + r() * 0.4)} cy={y + h * (0.3 + r() * 0.4)} r="4" fill="#e8742c" stroke="#5a2a10" strokeWidth=".8" />
    </g>
  );
}

function Tennis({ r, variant }: Ctx & { variant?: string }) {
  const clay = variant === 'clay';
  const park = variant === 'park';
  const surround = clay ? '#b95a34' : park ? '#3e7a4c' : '#3c8753';
  const court = clay ? '#c96a41' : park ? '#4f9160' : '#2f63c9';
  const x = 58;
  const y = 50;
  const w = 284;
  const h = 160;
  const alley = 20;
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill={park ? '#5d6b5a' : '#27313a'} />
      <rect x={x - 42} y={y - 36} width={w + 84} height={h + 72} fill={surround} />
      <rect x={x} y={y} width={w} height={h} fill={court} />
      <g {...line}>
        <rect x={x} y={y} width={w} height={h} />
        <line x1={x} y1={y + alley} x2={x + w} y2={y + alley} />
        <line x1={x} y1={y + h - alley} x2={x + w} y2={y + h - alley} />
        <line x1={x + 66} y1={y + alley} x2={x + 66} y2={y + h - alley} />
        <line x1={x + w - 66} y1={y + alley} x2={x + w - 66} y2={y + h - alley} />
        <line x1={x + 66} y1={y + h / 2} x2={x + w - 66} y2={y + h / 2} />
        <line x1={x} y1={y + h / 2} x2={x + 6} y2={y + h / 2} />
        <line x1={x + w - 6} y1={y + h / 2} x2={x + w} y2={y + h / 2} />
      </g>
      <line x1={x + w / 2 + 3} y1={y - 8} x2={x + w / 2 + 3} y2={y + h + 8} stroke="rgba(0,0,0,0.3)" strokeWidth="5" />
      <line x1={x + w / 2} y1={y - 8} x2={x + w / 2} y2={y + h + 8} stroke="#1a1d24" strokeWidth="3" />
      <line x1={x + w / 2} y1={y - 8} x2={x + w / 2} y2={y + h + 8} stroke="#f2f2f2" strokeWidth="1" strokeDasharray="2 3" />
      <Players r={r} n={4} x={x + 20} y={y + 10} w={w - 40} h={h - 20} colors={['#f5f5f0', '#1b1d26']} />
      <circle cx={x + w * (0.25 + r() * 0.5)} cy={y + h * (0.2 + r() * 0.6)} r="2.8" fill="#d8f33c" />
    </g>
  );
}

function Padel({ r, variant }: Ctx & { variant?: string }) {
  const green = variant === 'green';
  const turf = green ? '#2f9a5a' : '#2d5ed1';
  const x = 70;
  const y = 58;
  const w = 260;
  const h = 144;
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill="#23262f" />
      <rect x={x - 10} y={y - 10} width={w + 20} height={h + 20} fill="rgba(170,215,235,0.28)" stroke="rgba(210,238,248,0.85)" strokeWidth="3" />
      <rect x={x} y={y} width={w} height={h} fill={turf} />
      <g {...line}>
        <line x1={x + 44} y1={y} x2={x + 44} y2={y + h} />
        <line x1={x + w - 44} y1={y} x2={x + w - 44} y2={y + h} />
        <line x1={x + 44} y1={y + h / 2} x2={x + w - 44} y2={y + h / 2} />
      </g>
      <g stroke="rgba(230,235,240,0.45)" strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={x + w / 2 - 60 + i * 10} y1={y - 10} x2={x + w / 2 - 50 + i * 10} y2={y - 4} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`b${i}`} x1={x + w / 2 - 60 + i * 10} y1={y + h + 4} x2={x + w / 2 - 50 + i * 10} y2={y + h + 10} />
        ))}
      </g>
      <line x1={x + w / 2 + 3} y1={y} x2={x + w / 2 + 3} y2={y + h} stroke="rgba(0,0,0,0.3)" strokeWidth="5" />
      <line x1={x + w / 2} y1={y - 4} x2={x + w / 2} y2={y + h + 4} stroke="#15171d" strokeWidth="3" />
      <Players r={r} n={4} x={x + 20} y={y + 15} w={w - 40} h={h - 30} colors={['#f5f5f0', '#ff6b1a']} />
      <circle cx={x + w * (0.3 + r() * 0.4)} cy={y + h * (0.25 + r() * 0.5)} r="2.8" fill="#e9f53c" />
    </g>
  );
}

function Badminton({ r }: Ctx) {
  const courts = [0, 1, 2];
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill="#2b7d5f" />
      <Stripes x={-60} y={-60} w={W + 120} h={H + 120} n={24} a="#2a795c" b="#2d8162" vertical={false} />
      {courts.map((c) => {
        const x = 20 + c * 125;
        const y = 25;
        const w = 110;
        const h = 210;
        return (
          <g key={c}>
            <g stroke="rgba(255,236,120,0.95)" strokeWidth="2" fill="none">
              <rect x={x} y={y} width={w} height={h} />
              <line x1={x + 9} y1={y} x2={x + 9} y2={y + h} />
              <line x1={x + w - 9} y1={y} x2={x + w - 9} y2={y + h} />
              <line x1={x} y1={y + 13} x2={x + w} y2={y + 13} />
              <line x1={x} y1={y + h - 13} x2={x + w} y2={y + h - 13} />
              <line x1={x} y1={y + h / 2 - 34} x2={x + w} y2={y + h / 2 - 34} />
              <line x1={x} y1={y + h / 2 + 34} x2={x + w} y2={y + h / 2 + 34} />
              <line x1={x + w / 2} y1={y + 13} x2={x + w / 2} y2={y + h / 2 - 34} />
              <line x1={x + w / 2} y1={y + h / 2 + 34} x2={x + w / 2} y2={y + h - 13} />
            </g>
            <line x1={x - 6} y1={y + h / 2 + 3} x2={x + w + 6} y2={y + h / 2 + 3} stroke="rgba(0,0,0,0.3)" strokeWidth="4" />
            <line x1={x - 6} y1={y + h / 2} x2={x + w + 6} y2={y + h / 2} stroke="#f2f2f2" strokeWidth="2" strokeDasharray="1.5 2" />
            <Players r={r} n={c === 1 ? 2 : 4} x={x + 15} y={y + 25} w={w - 30} h={h - 50} colors={['#f5f5f0', '#1b1d26']} />
          </g>
        );
      })}
    </g>
  );
}

function Volleyball({ r, variant }: Ctx & { variant?: string }) {
  const beach = variant !== 'indoor';
  const x = 70;
  const y = 50;
  const w = 260;
  const h = 160;
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill={beach ? '#dcc08a' : '#c68d55'} />
      {beach &&
        Array.from({ length: 220 }, (_, i) => <circle key={i} cx={r() * W} cy={r() * H} r={0.6 + r() * 1.2} fill={r() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(150,110,60,0.25)'} />)}
      {!beach && <rect x={x} y={y} width={w} height={h} fill="#e07a3a" />}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={beach ? '#2f63c9' : '#fff'} strokeWidth="3.5" />
      {!beach && <line x1={x + w / 2 - 44} y1={y} x2={x + w / 2 - 44} y2={y + h} {...line} />}
      {!beach && <line x1={x + w / 2 + 44} y1={y} x2={x + w / 2 + 44} y2={y + h} {...line} />}
      <line x1={x + w / 2 + 3} y1={y - 16} x2={x + w / 2 + 3} y2={y + h + 16} stroke="rgba(0,0,0,0.25)" strokeWidth="5" />
      <line x1={x + w / 2} y1={y - 16} x2={x + w / 2} y2={y + h + 16} stroke="#15171d" strokeWidth="3" />
      <circle cx={x + w / 2} cy={y - 18} r="4" fill="#15171d" />
      <circle cx={x + w / 2} cy={y + h + 18} r="4" fill="#15171d" />
      <Players r={r} n={beach ? 4 : 10} x={x + 20} y={y + 15} w={w - 40} h={h - 30} colors={['#ff6b1a', '#1b1d26']} />
      <circle cx={x + w * (0.3 + r() * 0.4)} cy={y + h * (0.3 + r() * 0.4)} r="4.5" fill="#f6f1e0" stroke="#2f63c9" strokeWidth="1.2" />
    </g>
  );
}

function Cricket({ r }: Ctx) {
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill="#35713f" />
      <Stripes x={-60} y={-60} w={W + 120} h={H + 120} n={14} a="#336d3d" b="#397843" />
      {[0, 1, 2].map((i) => {
        const y = 38 + i * 64;
        return (
          <g key={i}>
            <rect x="20" y={y} width="360" height="52" fill="#3f9152" />
            <rect x="20" y={y} width="360" height="52" fill="none" stroke="#1f2a24" strokeWidth="3" />
            <line x1="70" y1={y + 6} x2="70" y2={y + 46} {...line} />
            <line x1="330" y1={y + 6} x2="330" y2={y + 46} {...line} />
            <g fill="#f4ecd4">
              <rect x="56" y={y + 22} width="3" height="8" />
              <rect x="341" y={y + 22} width="3" height="8" />
            </g>
          </g>
        );
      })}
      <g stroke="rgba(20,25,22,0.35)" strokeWidth="1">
        {Array.from({ length: 50 }, (_, i) => (
          <line key={i} x1={i * 9} y1="30" x2={i * 9} y2="236" />
        ))}
      </g>
      <Players r={r} n={3} x={60} y={50} w={280} h={160} colors={['#f5f5f0']} />
      <circle cx={200 + r() * 80} cy={120} r="2.6" fill="#b3221f" />
    </g>
  );
}

function Rugby({ r }: Ctx) {
  const x = 25;
  const y = 30;
  const w = 350;
  const h = 200;
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill="#2f6b3b" />
      <Stripes x={x} y={y} w={w} h={h} n={10} a="#3b8e48" b="#43994f" />
      <g {...line}>
        <rect x={x} y={y} width={w} height={h} />
        <line x1={x + 30} y1={y} x2={x + 30} y2={y + h} />
        <line x1={x + w - 30} y1={y} x2={x + w - 30} y2={y + h} />
        <line x1={x + 95} y1={y} x2={x + 95} y2={y + h} />
        <line x1={x + w - 95} y1={y} x2={x + w - 95} y2={y + h} />
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />
        <line x1={x + w / 2 - 30} y1={y} x2={x + w / 2 - 30} y2={y + h} strokeDasharray="10 8" />
        <line x1={x + w / 2 + 30} y1={y} x2={x + w / 2 + 30} y2={y + h} strokeDasharray="10 8" />
      </g>
      <g stroke="#fff" strokeWidth="3">
        <line x1={x + 30} y1={y + h / 2 - 16} x2={x + 30} y2={y + h / 2 + 16} />
        <line x1={x + w - 30} y1={y + h / 2 - 16} x2={x + w - 30} y2={y + h / 2 + 16} />
      </g>
      <Players r={r} n={12} x={x + 60} y={y + 20} w={w - 120} h={h - 40} colors={['#7c4ddb', '#f5f5f0']} />
    </g>
  );
}

function Running({ r }: Ctx) {
  const cx = 200;
  const cy = 130;
  const lanes = 8;
  const inner = { rx: 64, ry: 58, straight: 150 };
  const laneW = 7;
  const outer = inner.ry + lanes * laneW;
  const track = (ry: number) => `M${cx - inner.straight / 2} ${cy - ry} h${inner.straight} a ${ry} ${ry} 0 0 1 0 ${ry * 2} h${-inner.straight} a ${ry} ${ry} 0 0 1 0 ${-ry * 2}z`;
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill="#35713f" />
      <path d={track(outer + 6)} fill="#2d6137" />
      <path d={track(outer)} fill="#c1553b" />
      <path d={track(inner.ry)} fill="#3f8b4a" />
      <Stripes x={cx - inner.straight / 2} y={cy - inner.ry + 6} w={inner.straight} h={inner.ry * 2 - 12} n={8} a="#3f8b4a" b="#459651" />
      {Array.from({ length: lanes + 1 }, (_, i) => (
        <path key={i} d={track(inner.ry + i * laneW)} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
      ))}
      <line x1={cx + 30} y1={cy + inner.ry} x2={cx + 30} y2={cy + outer} stroke="#fff" strokeWidth="2" />
      {Array.from({ length: 5 }, (_, i) => {
        const lane = inner.ry + laneW * (1 + Math.floor(r() * 7)) - laneW / 2;
        const px = cx - 40 + r() * 120;
        return <circle key={i} cx={px} cy={cy + (r() > 0.5 ? lane : -lane)} r="3.6" fill={['#f5f5f0', '#ff6b1a', '#2f63c9'][i % 3]} stroke="rgba(0,0,0,0.3)" />;
      })}
    </g>
  );
}

function Gym({ r, variant }: Ctx & { variant?: string }) {
  if (variant === 'outdoor') {
    return (
      <g>
        <rect x="-60" y="-60" width={W + 120} height={H + 120} fill="#4d8a54" />
        <rect x="60" y="40" width="280" height="180" rx="10" fill="#2e3440" />
        {[0, 1, 2].map((i) => (
          <g key={i} stroke="#c9ced8" strokeWidth="5" strokeLinecap="round">
            <line x1={100 + i * 90} y1="70" x2={100 + i * 90} y2="190" />
            <line x1={140 + i * 90} y1="70" x2={140 + i * 90} y2="190" />
            <line x1={100 + i * 90} y1="100" x2={140 + i * 90} y2="100" />
          </g>
        ))}
        <Players r={r} n={3} x={90} y={70} w={220} h={120} colors={['#f5f5f0', '#ff6b1a']} />
      </g>
    );
  }
  const strength = variant === 'strength';
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill="#1f2229" />
      {Array.from({ length: 12 }, (_, i) =>
        Array.from({ length: 8 }, (_, j) => <rect key={`${i}-${j}`} x={i * 40 - 20} y={j * 40 - 20} width="39" height="39" fill={(i + j) % 2 ? '#24282f' : '#22252c'} />),
      )}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={30 + i * 90} y="40" width="70" height="90" fill={strength ? '#b7864f' : '#2e333d'} />
          <rect x={30 + i * 90} y="40" width="70" height="90" fill="none" stroke="#4a505c" strokeWidth="3" />
          <line x1={38 + i * 90} y1="85" x2={92 + i * 90} y2="85" stroke="#c6cad3" strokeWidth="3" />
          <circle cx={40 + i * 90} cy="85" r="10" fill="#15171c" stroke={['#e4572e', '#3346f5', '#e0b21f', '#138a4b'][i]} strokeWidth="3" />
          <circle cx={90 + i * 90} cy="85" r="10" fill="#15171c" stroke={['#e4572e', '#3346f5', '#e0b21f', '#138a4b'][i]} strokeWidth="3" />
        </g>
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={40 + i * 33} y="175" width="22" height="46" rx="4" fill="#353a45" stroke="#4a505c" />
      ))}
      <Players r={r} n={4} x={40} y={140} w={320} h={30} colors={['#f5f5f0', '#ff6b1a']} />
    </g>
  );
}

function Swimming({ r, variant, id }: Ctx & { variant?: string }) {
  const lido = variant === 'lido';
  const lanes = 6;
  const x = 40;
  const y = 42;
  const w = 320;
  const h = 176;
  return (
    <g>
      <rect x="-60" y="-60" width={W + 120} height={H + 120} fill={lido ? '#e9e2d3' : '#d9dde3'} />
      {Array.from({ length: 22 }, (_, i) => (
        <line key={i} x1={-60 + i * 24} y1="-60" x2={-60 + i * 24} y2={H + 60} stroke="rgba(0,0,0,0.05)" />
      ))}
      <defs>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4cc0e6" />
          <stop offset="1" stopColor="#1f86c2" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={`url(#${id}-water)`} stroke="#f7f7f5" strokeWidth="5" />
      {Array.from({ length: 16 }, (_, i) => (
        <path
          key={i}
          d={`M${x + r() * w} ${y + r() * h} q 12 -6 24 0 t 24 0`}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.4"
        />
      ))}
      {Array.from({ length: lanes - 1 }, (_, i) => (
        <line key={i} x1={x} y1={y + ((i + 1) * h) / lanes} x2={x + w} y2={y + ((i + 1) * h) / lanes} stroke={i % 2 ? '#e4572e' : '#f5f5f0'} strokeWidth="2.5" strokeDasharray="4 3" />
      ))}
      {Array.from({ length: lanes }, (_, i) => (
        <line key={`m${i}`} x1={x + 20} y1={y + ((i + 0.5) * h) / lanes} x2={x + w - 20} y2={y + ((i + 0.5) * h) / lanes} stroke="rgba(20,40,80,0.35)" strokeWidth="3" />
      ))}
      {Array.from({ length: 4 }, (_, i) => {
        const lane = Math.floor(r() * lanes);
        const px = x + 40 + r() * (w - 80);
        const py = y + ((lane + 0.5) * h) / lanes;
        return (
          <g key={`s${i}`}>
            <path d={`M${px - 22} ${py} q 8 -4 16 0 q 8 4 16 0`} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" />
            <ellipse cx={px} cy={py} rx="7" ry="3" fill="#f4d6c0" />
            <circle cx={px + 7} cy={py} r="2.6" fill={['#e4572e', '#3346f5', '#e0b21f'][i % 3]} />
          </g>
        );
      })}
      {lido &&
        [0, 1, 2, 3, 4].map((i) => <rect key={i} x={60 + i * 62} y="230" width="36" height="16" rx="3" fill={['#ff6b1a', '#f5f5f0', '#3346f5'][i % 3]} opacity=".85" />)}
    </g>
  );
}

function Climbing({ r }: Ctx) {
  const panels = [
    'M-20 -20 L140 -20 L120 120 L-20 150 Z',
    'M140 -20 L290 -20 L300 110 L120 120 Z',
    'M290 -20 L430 -20 L430 160 L300 110 Z',
    'M-20 150 L120 120 L150 290 L-20 290 Z',
    'M120 120 L300 110 L280 290 L150 290 Z',
    'M300 110 L430 160 L430 290 L280 290 Z',
  ];
  const holdColors = ['#e4572e', '#3346f5', '#e0b21f', '#138a4b', '#c2417a', '#f5f5f0', '#7c4ddb'];
  return (
    <g>
      {panels.map((d, i) => (
        <path key={i} d={d} fill={['#8b93a3', '#7b8394', '#959cab', '#737b8c', '#868ea0', '#7f8798'][i]} stroke="#5d6474" strokeWidth="2" />
      ))}
      {Array.from({ length: 70 }, (_, i) => {
        const c = holdColors[Math.floor(r() * holdColors.length)];
        const cx = r() * W;
        const cy = r() * H;
        const s = 3 + r() * 7;
        return (
          <g key={i}>
            <ellipse cx={cx + 1.5} cy={cy + 2} rx={s} ry={s * 0.75} fill="rgba(0,0,0,0.25)" />
            <ellipse cx={cx} cy={cy} rx={s} ry={s * 0.75} fill={c} transform={`rotate(${r() * 180} ${cx} ${cy})`} />
          </g>
        );
      })}
      <rect x="-20" y="236" width="440" height="40" fill="#2a3d6e" />
    </g>
  );
}

// ---------------------------------------------------------------- places

function Changing({ r }: Ctx) {
  const tone = ['#3346f5', '#0f8c80', '#4e5670', '#d9661f'][Math.floor(r() * 4)];
  return (
    <g>
      <rect width={W} height={H} fill="#e8e6e1" />
      {Array.from({ length: 9 }, (_, i) =>
        [0, 1].map((j) => (
          <g key={`${i}-${j}`}>
            <rect x={14 + i * 42} y={24 + j * 84} width="38" height="80" rx="2" fill={tone} opacity={j ? 0.9 : 1} />
            <rect x={20 + i * 42} y={34 + j * 84} width="26" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
            <rect x={20 + i * 42} y={40 + j * 84} width="26" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
            <circle cx={44 + i * 42} cy={64 + j * 84} r="2.2" fill="rgba(255,255,255,0.8)" />
          </g>
        )),
      )}
      <rect y="196" width={W} height={H - 196} fill="#cfcbc3" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={i * 36} y1="196" x2={i * 36 - 20} y2={H} stroke="rgba(0,0,0,0.08)" />
      ))}
      <rect x="30" y="200" width="340" height="14" rx="3" fill="#b8844e" />
      <rect x="44" y="214" width="8" height="26" fill="#6a4a2c" />
      <rect x="348" y="214" width="8" height="26" fill="#6a4a2c" />
      <rect x="120" y="190" width="40" height="12" rx="4" fill="#f5f5f0" />
    </g>
  );
}

function Entrance({ r, variant }: Ctx & { variant?: string }) {
  const heritage = variant === 'heritage';
  const wall = heritage ? '#a8563d' : ['#2f3a4f', '#474f63', '#1f2533'][Math.floor(r() * 3)];
  return (
    <g>
      <rect width={W} height={H} fill="#b9dcf2" />
      <rect x="20" y="30" width="360" height="190" fill={wall} />
      {heritage &&
        Array.from({ length: 19 }, (_, i) => <line key={i} x1="20" y1={30 + i * 10} x2="380" y2={30 + i * 10} stroke="rgba(0,0,0,0.12)" />)}
      {heritage && <path d="M140 110 a60 60 0 0 1 120 0 v110 h-120z" fill="#6d3322" />}
      <rect x="60" y="50" width="280" height="30" rx="4" fill="#0c0f1e" />
      <circle cx="84" cy="65" r="9" fill="var(--brand, #2f3cf4)" />
      <rect x="100" y="60" width="130" height="10" rx="3" fill="#f5f5f0" />
      <rect x="150" y="120" width="100" height="100" fill="#9fd2ec" stroke="#1a1d24" strokeWidth="4" />
      <line x1="200" y1="120" x2="200" y2="220" stroke="#1a1d24" strokeWidth="3" />
      <path d="M150 120 l40 100 M210 120 l40 100" stroke="rgba(255,255,255,0.45)" strokeWidth="6" />
      {[40, 280].map((x) => (
        <g key={x}>
          <rect x={x} y="110" width="80" height="60" fill="#9fd2ec" stroke="#1a1d24" strokeWidth="3" />
          <line x1={x + 40} y1="110" x2={x + 40} y2="170" stroke="#1a1d24" strokeWidth="2" />
        </g>
      ))}
      <rect y="220" width={W} height="40" fill="#bdbab3" />
      <circle cx="16" cy="170" r="30" fill="#3c7a4c" />
      <circle cx="388" cy="165" r="34" fill="#35713f" />
    </g>
  );
}

function Cafe({ r }: Ctx) {
  return (
    <g>
      <rect width={W} height={H} fill="#d9c7a8" />
      {Array.from({ length: 30 }, (_, i) => (
        <line key={i} x1={i * 16 - 40} y1="0" x2={i * 16 + 40} y2={H} stroke="rgba(120,80,40,0.12)" strokeWidth="6" />
      ))}
      {Array.from({ length: 6 }, (_, i) => {
        const cx = 70 + (i % 3) * 130 + (r() - 0.5) * 20;
        const cy = 75 + Math.floor(i / 3) * 110 + (r() - 0.5) * 16;
        return (
          <g key={i}>
            {[0, 1, 2, 3].map((k) => (
              <circle key={k} cx={cx + Math.cos((k * Math.PI) / 2 + 0.6) * 42} cy={cy + Math.sin((k * Math.PI) / 2 + 0.6) * 42} r="12" fill="#2c2f38" />
            ))}
            <circle cx={cx + 3} cy={cy + 4} r="30" fill="rgba(0,0,0,0.2)" />
            <circle cx={cx} cy={cy} r="30" fill="#f5f2ea" />
            <circle cx={cx - 8} cy={cy - 6} r="6" fill="#fff" stroke="#8b5a2b" strokeWidth="2" />
            <circle cx={cx - 8} cy={cy - 6} r="3" fill="#8b5a2b" />
            {r() > 0.4 && <circle cx={cx + 9} cy={cy + 6} r="6" fill="#fff" stroke="#8b5a2b" strokeWidth="2" />}
          </g>
        );
      })}
    </g>
  );
}

function Seating({ r }: Ctx) {
  const colors = ['#3346f5', '#3346f5', '#3346f5', '#f5f5f0'];
  return (
    <g>
      <rect width={W} height={H} fill="#8fc4ea" />
      {Array.from({ length: 8 }, (_, row) => (
        <g key={row}>
          <rect x="0" y={40 + row * 26} width={W} height="26" fill={row % 2 ? '#5a6275' : '#646c80'} />
          {Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={6 + i * 18 + (row % 2) * 9} y={44 + row * 26} width="13" height="14" rx="3" fill={colors[Math.floor(r() * colors.length)]} />
          ))}
        </g>
      ))}
      <rect y="248" width={W} height="12" fill="#3a8a47" />
    </g>
  );
}

function Equipment({ r, variant }: Ctx & { variant?: string }) {
  const kind = variant ?? 'football';
  const ballColor = kind === 'tennis' ? '#d8f33c' : kind === 'cricket' ? '#b3221f' : kind === 'climbing' ? '#e4572e' : kind === 'gym' ? '#2c2f38' : '#f5f5f0';
  return (
    <g>
      <rect width={W} height={H} fill="#3a3f4c" />
      <rect x="30" y="30" width="340" height="200" rx="10" fill="#262a33" stroke="#50566a" strokeWidth="4" />
      {Array.from({ length: 36 }, (_, i) => {
        const cx = 55 + (i % 9) * 36 + (Math.floor(i / 9) % 2) * 12 + (r() - 0.5) * 6;
        const cy = 60 + Math.floor(i / 9) * 44 + (r() - 0.5) * 6;
        const rad = kind === 'tennis' || kind === 'cricket' ? 11 : 16;
        return (
          <g key={i}>
            <circle cx={cx + 2} cy={cy + 3} r={rad} fill="rgba(0,0,0,0.35)" />
            <circle cx={cx} cy={cy} r={rad} fill={kind === 'gym' ? ['#e4572e', '#3346f5', '#e0b21f', '#138a4b'][i % 4] : ballColor} />
            {kind === 'football' && <path d={`M${cx - 5} ${cy - 3} l5 -4 5 4 -2 6 h-6 z`} fill="#1b1d26" />}
            {kind === 'tennis' && <path d={`M${cx - 8} ${cy - 5} q 8 5 0 10 M${cx + 8} ${cy - 5} q -8 5 0 10`} stroke="#fff" strokeWidth="1.4" fill="none" />}
            {kind === 'gym' && <circle cx={cx} cy={cy} r="5" fill="#15171c" />}
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------- lighting

function Lighting({ time, id, indoor }: { time: 'day' | 'dusk' | 'night'; id: string; indoor: boolean }) {
  if (indoor) {
    return (
      <g>
        <defs>
          <radialGradient id={`${id}-in`} cx="50%" cy="30%" r="80%">
            <stop offset="0" stopColor="#fff" stopOpacity=".16" />
            <stop offset="1" stopColor="#000" stopOpacity=".28" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-in)`} />
      </g>
    );
  }
  if (time === 'night') {
    const lights = [
      [30, 20],
      [370, 20],
      [30, 240],
      [370, 240],
    ];
    return (
      <g>
        <defs>
          <radialGradient id={`${id}-fl`}>
            <stop offset="0" stopColor="#fff3cf" stopOpacity=".42" />
            <stop offset=".45" stopColor="#ffe9b0" stopOpacity=".12" />
            <stop offset="1" stopColor="#fff2c4" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="#050919" opacity=".58" />
        {lights.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="150" fill={`url(#${id}-fl)`} style={{ mixBlendMode: 'screen' }} />
            <circle cx={x} cy={y} r="5" fill="#fffbe8" />
          </g>
        ))}
      </g>
    );
  }
  if (time === 'dusk') {
    return (
      <g>
        <defs>
          <linearGradient id={`${id}-dk`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffb36b" stopOpacity=".38" />
            <stop offset="1" stopColor="#5b2f8a" stopOpacity=".32" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-dk)`} />
      </g>
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sun)`} />
    </g>
  );
}

const INDOOR_KINDS = new Set(['gym', 'climbing', 'changing', 'cafe', 'badminton', 'equipment']);
const TILTED = new Set(['football', 'basketball', 'tennis', 'padel', 'volleyball', 'rugby', 'running', 'swimming', 'cricket']);

function Scene({ kind, variant, ctx }: { kind: ArtSpec['kind']; variant?: string; ctx: Ctx }) {
  switch (kind) {
    case 'football':
      return <Football {...ctx} variant={variant} />;
    case 'basketball':
      return <Basketball {...ctx} variant={variant} />;
    case 'tennis':
      return <Tennis {...ctx} variant={variant} />;
    case 'padel':
      return <Padel {...ctx} variant={variant} />;
    case 'badminton':
      return <Badminton {...ctx} />;
    case 'volleyball':
      return <Volleyball {...ctx} variant={variant} />;
    case 'cricket':
      return <Cricket {...ctx} />;
    case 'rugby':
      return <Rugby {...ctx} />;
    case 'running':
      return <Running {...ctx} />;
    case 'gym':
      return <Gym {...ctx} variant={variant} />;
    case 'swimming':
      return <Swimming {...ctx} variant={variant} />;
    case 'climbing':
      return <Climbing {...ctx} />;
    case 'changing':
      return <Changing {...ctx} />;
    case 'entrance':
      return <Entrance {...ctx} variant={variant} />;
    case 'cafe':
      return <Cafe {...ctx} />;
    case 'seating':
      return <Seating {...ctx} />;
    case 'equipment':
      return <Equipment {...ctx} variant={variant} />;
  }
}

export const Artwork = memo(function Artwork({ art, className, label }: { art: ArtSpec; className?: string; label?: string }) {
  const raw = useId();
  const id = `a${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = rng(`${art.kind}-${art.variant ?? ''}-${art.seed ?? 0}`);
  const tilt = TILTED.has(art.kind) ? (r() - 0.5) * 16 : 0;
  const scale = TILTED.has(art.kind) ? 1.12 + Math.abs(tilt) / 60 : 1;
  const indoor = INDOOR_KINDS.has(art.kind) || art.variant === 'hardwood' || art.variant === 'indoor';
  const time = art.time ?? 'day';
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label ?? art.caption ?? 'Venue image'}
    >
      <g transform={`translate(${W / 2} ${H / 2}) rotate(${tilt.toFixed(2)}) scale(${scale.toFixed(3)}) translate(${-W / 2} ${-H / 2})`}>
        <Scene kind={art.kind} variant={art.variant} ctx={{ r, id }} />
      </g>
      <Lighting time={time} id={id} indoor={indoor && time === 'day'} />
    </svg>
  );
});

/** A representative image for a sport, used where there is no venue photo. */
export function sportArt(sport: import('../data/types').SportId, seed = 1, time: ArtSpec['time'] = 'day'): ArtSpec {
  const kind: ArtSpec['kind'] = sport === 'other' ? 'climbing' : sport;
  return { kind, caption: '', seed, time, variant: sport === 'basketball' ? 'outdoor' : sport === 'volleyball' ? 'beach' : sport === 'tennis' ? 'hard' : undefined };
}
