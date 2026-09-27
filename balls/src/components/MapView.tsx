import { LocateFixed, Minus, Plus } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AREA_LABELS, MAP_BOUNDS, MAP_CENTER, PARK_LABELS, PARKS, PATHS, PRIMARY_ROADS, RAILWAYS, SECONDARY_ROADS, WATER, WATERWAYS, type LatLng } from '../data/map';
import type { SportId } from '../data/types';
import { cx } from '../lib/format';
import { rng } from '../lib/rng';
import { SportIcon } from './icons';

/**
 * Vector map renderer with pan, pinch/wheel zoom, inertia and HTML markers.
 * Geometry is projected once into metres around MAP_CENTER; the camera is a
 * centre point plus a zoom in pixels-per-metre.
 */

const K_LAT = 110_540;
const K_LNG = 111_320 * Math.cos((MAP_CENTER.lat * Math.PI) / 180);

export function project(lat: number, lng: number): [number, number] {
  return [(lng - MAP_CENTER.lng) * K_LNG, -(lat - MAP_CENTER.lat) * K_LAT];
}

const toPath = (pts: LatLng[], close = false) =>
  pts
    .map(([la, ln], i) => {
      const [x, y] = project(la, ln);
      return `${i ? 'L' : 'M'}${x.toFixed(0)} ${y.toFixed(0)}`;
    })
    .join('') + (close ? 'Z' : '');

function pointInPoly(x: number, y: number, poly: Array<[number, number]>) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Residential streets: a patchwork of small street grids, each at its own
 * angle, which reads like London terraces at map scale. Streets never cross
 * parks or water.
 */
function minorStreets(): string {
  const r = rng('streets');
  const parks = [...PARKS.map((p) => p.pts), ...WATER.map((w) => w.pts)].map((pts) => pts.map(([la, ln]) => project(la, ln)));
  const inPark = (x: number, y: number) => parks.some((p) => pointInPoly(x, y, p));
  const [x0, y0] = project(MAP_BOUNDS.north, MAP_BOUNDS.west);
  const [x1, y1] = project(MAP_BOUNDS.south, MAP_BOUNDS.east);
  const cell = 520;
  let d = '';
  for (let cx = x0; cx < x1; cx += cell) {
    for (let cy = y0; cy < y1; cy += cell) {
      const angle = (r() - 0.5) * 1.3;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const midX = cx + cell / 2;
      const midY = cy + cell / 2;
      const gap = 85 + r() * 50;
      const lines = Math.floor(cell / gap);
      for (let dir = 0; dir < 2; dir++) {
        const count = dir === 0 ? lines : Math.max(1, Math.floor(lines / 2.4));
        const spacing = cell / (count + 1);
        for (let i = 1; i <= count; i++) {
          const off = -cell / 2 + i * spacing + (r() - 0.5) * 18;
          const half = cell / 2 - 6 - r() * 40;
          const ax = dir === 0 ? -half : off;
          const ay = dir === 0 ? off : -half;
          const bx = dir === 0 ? half : off;
          const by = dir === 0 ? off : half;
          const p1x = midX + ax * cos - ay * sin;
          const p1y = midY + ax * sin + ay * cos;
          const p2x = midX + bx * cos - by * sin;
          const p2y = midY + bx * sin + by * cos;
          const segs = 4;
          let open = false;
          for (let k = 0; k <= segs; k++) {
            const t = k / segs;
            const px = p1x + (p2x - p1x) * t;
            const py = p1y + (p2y - p1y) * t;
            if (inPark(px, py)) {
              open = false;
              continue;
            }
            d += `${open ? 'L' : 'M'}${px.toFixed(0)} ${py.toFixed(0)}`;
            open = true;
          }
        }
      }
    }
  }
  return d;
}

interface Geometry {
  parks: Array<{ d: string; kind: string }>;
  water: string[];
  waterways: string[];
  rail: string[];
  paths: string[];
  primary: string[];
  secondary: string[];
  minor: string;
}

let GEO: Geometry | null = null;
function geometry(): Geometry {
  if (GEO) return GEO;
  GEO = {
    parks: PARKS.map((p) => ({ d: toPath(p.pts, true), kind: p.kind ?? 'park' })),
    water: WATER.map((w) => toPath(w.pts, true)),
    waterways: WATERWAYS.map((w) => toPath(w)),
    rail: RAILWAYS.map((w) => toPath(w)),
    paths: PATHS.map((w) => toPath(w)),
    primary: PRIMARY_ROADS.map((w) => toPath(w)),
    secondary: SECONDARY_ROADS.map((w) => toPath(w)),
    minor: minorStreets(),
  };
  return GEO;
}

const BASE = memo(function BaseLayer({ z }: { z: number }) {
  const g = geometry();
  const w = (min: number, max: number, at: number) => Math.max(min, Math.min(max, min + (z - 0.08) * at));
  const primary = w(3.2, 11, 30);
  const secondary = w(2, 7.5, 22);
  const minor = w(0.8, 4, 12);
  return (
    <>
      {g.parks.map((p, i) => (
        <path key={i} d={p.d} className={`map-park map-park--${p.kind}`} />
      ))}
      {g.water.map((d, i) => (
        <path key={i} d={d} className="map-water" />
      ))}
      {g.waterways.map((d, i) => (
        <path key={i} d={d} className="map-waterway" style={{ strokeWidth: w(2, 5, 12) }} />
      ))}
      {z > 0.07 && <path d={g.minor} className="map-minor" style={{ strokeWidth: minor }} />}
      {g.paths.map((d, i) => (
        <path key={i} d={d} className="map-path" style={{ strokeWidth: w(2, 5, 10) }} />
      ))}
      {g.rail.map((d, i) => (
        <path key={i} d={d} className="map-rail" />
      ))}
      {g.secondary.map((d, i) => (
        <path key={`sc${i}`} d={d} className="map-casing" style={{ strokeWidth: secondary + 1.6 }} />
      ))}
      {g.primary.map((d, i) => (
        <path key={`pc${i}`} d={d} className="map-casing" style={{ strokeWidth: primary + 2 }} />
      ))}
      {g.secondary.map((d, i) => (
        <path key={`s${i}`} d={d} className="map-road" style={{ strokeWidth: secondary }} />
      ))}
      {g.primary.map((d, i) => (
        <path key={`p${i}`} d={d} className="map-road map-road--primary" style={{ strokeWidth: primary }} />
      ))}
    </>
  );
});

export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  sport: SportId;
  label: string;
  title: string;
  muted?: boolean;
}

export function MapMarker({ m, x, y, selected, onSelect, showLabel }: { m: MapMarkerData; x: number; y: number; selected: boolean; onSelect: (id: string) => void; showLabel: boolean }) {
  return (
    <button
      type="button"
      className={cx('marker', selected && 'is-selected', m.muted && 'is-muted', !showLabel && !selected && 'is-dot')}
      style={{ transform: `translate(${x}px, ${y}px)`, zIndex: selected ? 30 : 10 + Math.round(y / 40) }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(m.id);
      }}
      aria-label={`${m.title}, ${m.label}`}
      aria-pressed={selected}
      data-marker
    >
      <span className="marker__pin">
        <span className="marker__icon">
          <SportIcon sport={m.sport} size={14} strokeWidth={2} />
        </span>
        {(showLabel || selected) && <span className="marker__label">{m.label}</span>}
      </span>
    </button>
  );
}

export interface Camera {
  x: number;
  y: number;
  z: number;
}

const MIN_Z = 0.045;
const MAX_Z = 0.9;

/** Persisted across mounts so the Explore map keeps its view between tabs. */
const savedCameras = new Map<string, Camera>();

export function MapView({
  markers,
  selectedId,
  onSelect,
  user,
  interactive = true,
  initialZoom = 0.13,
  center,
  cameraKey,
  className,
  bottomInset = 0,
  focus,
  controls = true,
}: {
  markers: MapMarkerData[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  user?: { lat: number; lng: number } | null;
  interactive?: boolean;
  initialZoom?: number;
  center?: { lat: number; lng: number };
  cameraKey?: string;
  className?: string;
  bottomInset?: number;
  /** When this changes, the camera animates to the point. */
  focus?: { lat: number; lng: number; zoom?: number; key: string } | null;
  controls?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 600 });
  const start = center ?? user ?? MAP_CENTER;
  const [cam, setCam] = useState<Camera>(() => (cameraKey && savedCameras.get(cameraKey)) || { x: project(start.lat, start.lng)[0], y: project(start.lat, start.lng)[1], z: initialZoom });
  const camRef = useRef(cam);
  camRef.current = cam;
  const anim = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (cameraKey) savedCameras.set(cameraKey, cam);
  }, [cam, cameraKey]);

  const bounds = useMemo(() => {
    const [x0, y0] = project(MAP_BOUNDS.north, MAP_BOUNDS.west);
    const [x1, y1] = project(MAP_BOUNDS.south, MAP_BOUNDS.east);
    return { x0, y0, x1, y1 };
  }, []);

  const clampCam = useCallback(
    (c: Camera): Camera => {
      const z = Math.min(MAX_Z, Math.max(MIN_Z, c.z));
      return { z, x: Math.min(bounds.x1, Math.max(bounds.x0, c.x)), y: Math.min(bounds.y1, Math.max(bounds.y0, c.y)) };
    },
    [bounds],
  );

  const animateTo = useCallback(
    (target: Camera, ms = 420) => {
      if (anim.current) cancelAnimationFrame(anim.current);
      const from = camRef.current;
      const to = clampCam(target);
      const t0 = performance.now();
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const step = (t: number) => {
        const k = reduce ? 1 : Math.min(1, (t - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        setCam({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z + (to.z - from.z) * e });
        if (k < 1) anim.current = requestAnimationFrame(step);
        else anim.current = null;
      };
      anim.current = requestAnimationFrame(step);
    },
    [clampCam],
  );

  // Fly to a requested focus point, leaving room for the bottom sheet.
  const focusKey = focus?.key;
  useEffect(() => {
    if (!focus) return;
    const [x, y] = project(focus.lat, focus.lng);
    const z = focus.zoom ?? Math.max(camRef.current.z, 0.16);
    animateTo({ x, y: y + bottomInset / 2 / z, z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  // Keep a newly selected marker clear of the preview card and the search bar.
  useEffect(() => {
    if (!selectedId || !interactive) return;
    const m = markers.find((x) => x.id === selectedId);
    if (!m) return;
    const c = camRef.current;
    const [x, y] = project(m.lat, m.lng);
    const sy = (y - c.y) * c.z + size.h / 2;
    const sx = (x - c.x) * c.z + size.w / 2;
    const topSafe = 150;
    const bottomSafe = size.h - bottomInset - 30;
    if (sy < topSafe || sy > bottomSafe || sx < 30 || sx > size.w - 30) {
      const targetY = (topSafe + bottomSafe) / 2;
      animateTo({ x, y: y - (targetY - size.h / 2) / c.z, z: c.z });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---- gestures
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; lastT: number; vx: number; vy: number; pinch?: { d: number; z: number } }>({ moved: 0, lastT: 0, vx: 0, vy: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || (e.target as HTMLElement).closest('[data-marker],[data-map-ui]')) return;
    if (anim.current) cancelAnimationFrame(anim.current);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { moved: 0, lastT: performance.now(), vx: 0, vy: 0 };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: camRef.current.z };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    const c = camRef.current;
    if (pointers.current.size >= 2 && gesture.current.pinch) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = ref.current!.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      const nz = Math.min(MAX_Z, Math.max(MIN_Z, (gesture.current.pinch.z * d) / gesture.current.pinch.d));
      zoomAround(nz, mx, my);
      gesture.current.moved += 10;
      return;
    }
    const dx = now.x - prev.x;
    const dy = now.y - prev.y;
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    const t = performance.now();
    const dt = Math.max(1, t - gesture.current.lastT);
    gesture.current.vx = dx / dt;
    gesture.current.vy = dy / dt;
    gesture.current.lastT = t;
    setCam(clampCam({ ...c, x: c.x - dx / c.z, y: c.y - dy / c.z }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.pinch = undefined;
    if (pointers.current.size > 0) return;
    const g = gesture.current;
    if (g.moved < 6) {
      onSelect?.(null);
      return;
    }
    // Inertia.
    let vx = g.vx;
    let vy = g.vy;
    if (performance.now() - g.lastT > 80 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let last = performance.now();
    const step = (t: number) => {
      const dt = t - last;
      last = t;
      vx *= Math.pow(0.992, dt);
      vy *= Math.pow(0.992, dt);
      const c = camRef.current;
      setCam(clampCam({ ...c, x: c.x - (vx * dt) / c.z, y: c.y - (vy * dt) / c.z }));
      if (Math.abs(vx) + Math.abs(vy) > 0.02) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  const zoomAround = (nz: number, sx: number, sy: number) => {
    const c = camRef.current;
    const wx = c.x + (sx - size.w / 2) / c.z;
    const wy = c.y + (sy - size.h / 2) / c.z;
    const z = Math.min(MAX_Z, Math.max(MIN_Z, nz));
    setCam(clampCam({ z, x: wx - (sx - size.w / 2) / z, y: wy - (sy - size.h / 2) / z }));
  };

  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      zoomAround(camRef.current.z * factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const toScreen = (lat: number, lng: number) => {
    const [x, y] = project(lat, lng);
    return [(x - cam.x) * cam.z + size.w / 2, (y - cam.y) * cam.z + size.h / 2] as const;
  };

  const zoomBtn = (f: number) => animateTo({ ...cam, z: cam.z * f }, 260);
  const recenter = () => {
    if (!user) return;
    const [x, y] = project(user.lat, user.lng);
    animateTo({ x, y: y + bottomInset / 2 / Math.max(cam.z, 0.14), z: Math.max(cam.z, 0.14) });
  };

  const showLabels = cam.z >= 0.1;
  const labels = AREA_LABELS.filter((l) => l.major || cam.z > 0.15);
  const pad = 60;
  const onScreen = (x: number, y: number) => x > -pad && y > -pad && x < size.w + pad && y < size.h + pad;

  return (
    <div
      ref={ref}
      className={cx('map', interactive && 'map--interactive', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => {
        if (!interactive || (e.target as HTMLElement).closest('[data-marker],[data-map-ui]')) return;
        const rect = ref.current!.getBoundingClientRect();
        zoomAround(cam.z * 1.8, e.clientX - rect.left, e.clientY - rect.top);
      }}
      role="application"
      aria-label="Map of sports venues near you. Use the list view for a screen-reader friendly version."
    >
      <svg className="map__svg" width={size.w} height={size.h} aria-hidden="true">
        <rect width={size.w} height={size.h} className="map-land" />
        <g transform={`translate(${size.w / 2 - cam.x * cam.z} ${size.h / 2 - cam.y * cam.z}) scale(${cam.z})`}>
          <BASE z={Math.round(cam.z * 200) / 200} />
        </g>
      </svg>

      <div className="map__labels" aria-hidden="true">
        {cam.z > 0.1 &&
          PARK_LABELS.map((l) => {
            const [x, y] = toScreen(l.at[0], l.at[1]);
            return onScreen(x, y) ? (
              <span key={l.name} className="map-label map-label--park" style={{ transform: `translate(${x}px, ${y}px)` }}>
                {l.name}
              </span>
            ) : null;
          })}
        {labels.map((l) => {
          const [x, y] = toScreen(l.at[0], l.at[1]);
          return onScreen(x, y) ? (
            <span key={l.name} className={cx('map-label', l.major && 'map-label--major')} style={{ transform: `translate(${x}px, ${y}px)` }}>
              {l.name}
            </span>
          ) : null;
        })}
      </div>

      {user &&
        (() => {
          const [x, y] = toScreen(user.lat, user.lng);
          const r = Math.max(18, 280 * cam.z);
          return (
            <div className="map__user" style={{ transform: `translate(${x}px, ${y}px)` }} aria-hidden="true">
              <span className="map__accuracy" style={{ width: r * 2, height: r * 2 }} />
              <span className="map__userdot" />
            </div>
          );
        })()}

      <div className="map__markers">
        {markers.map((m) => {
          const [x, y] = toScreen(m.lat, m.lng);
          if (!onScreen(x, y)) return null;
          return <MapMarker key={m.id} m={m} x={x} y={y} selected={m.id === selectedId} onSelect={(id) => onSelect?.(id)} showLabel={showLabels} />;
        })}
      </div>

      {interactive && controls && (
        <div className="map__controls" data-map-ui style={{ bottom: bottomInset + 16 }}>
          <div className="map__zoom">
            <button type="button" onClick={() => zoomBtn(1.5)} aria-label="Zoom in">
              <Plus size={18} />
            </button>
            <button type="button" onClick={() => zoomBtn(1 / 1.5)} aria-label="Zoom out">
              <Minus size={18} />
            </button>
          </div>
          {user && (
            <button type="button" className="map__locate" onClick={recenter} aria-label="Centre on my location">
              <LocateFixed size={19} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
