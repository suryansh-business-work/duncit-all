import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;
const SWIPE_PX = 60;

interface View {
  scale: number;
  x: number;
  y: number;
}

interface Gesture {
  startView: View;
  startDist: number;
  startX: number;
  startY: number;
  moved: boolean;
}

const RESET: View = { scale: 1, x: 0, y: 0 };
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
const distance = (a: PointerPoint, b: PointerPoint) => Math.hypot(a.x - b.x, a.y - b.y);

interface PointerPoint {
  x: number;
  y: number;
}

/** Keeps a zoomed image from being dragged past its own edges. */
function clampPan(view: View, el: HTMLElement | null): View {
  if (view.scale <= MIN_SCALE || !el) return RESET;
  const maxX = ((view.scale - 1) * el.clientWidth) / 2;
  const maxY = ((view.scale - 1) * el.clientHeight) / 2;
  return {
    scale: view.scale,
    x: Math.min(maxX, Math.max(-maxX, view.x)),
    y: Math.min(maxY, Math.max(-maxY, view.y)),
  };
}

/**
 * Pinch, double-tap, wheel and drag zoom for one image, plus a sideways swipe
 * at rest. Pointer events cover touch, pen and mouse alike; the double-tap and
 * the + / - / 0 keys are the single-pointer and keyboard ways in (WCAG 2.5.1).
 */
export function usePinchZoom(onSwipe?: (direction: 'next' | 'prev') => void) {
  const [view, setView] = useState<View>(RESET);
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, PointerPoint>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef(0);

  const apply = useCallback((next: View) => setView(clampPan(next, ref.current)), []);

  const begin = (current: View) => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      startView: current,
      startDist: b ? distance(a, b) : 0,
      startX: a.x,
      startY: a.y,
      moved: gesture.current?.moved ?? false,
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = null;
    begin(view);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...pointers.current.values()];
    const dx = a.x - g.startX;
    const dy = a.y - g.startY;
    if (Math.hypot(dx, dy) > TAP_SLOP_PX) g.moved = true;
    if (b && g.startDist > 0) {
      apply({ ...g.startView, scale: clampScale((g.startView.scale * distance(a, b)) / g.startDist) });
    } else if (g.startView.scale > MIN_SCALE) {
      apply({ ...g.startView, x: g.startView.x + dx, y: g.startView.y + dy });
    }
  };

  const endTap = (now: number) => {
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      apply(view.scale > MIN_SCALE ? RESET : { scale: DOUBLE_TAP_SCALE, x: 0, y: 0 });
      return;
    }
    lastTap.current = now;
  };

  const endSwipe = (e: ReactPointerEvent<HTMLDivElement>, g: Gesture) => {
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (onSwipe && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) onSwipe(dx < 0 ? 'next' : 'prev');
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      begin(view);
      return;
    }
    gesture.current = null;
    if (!g || !wasSingle) return;
    if (!g.moved) endTap(e.timeStamp);
    else if (g.startView.scale === MIN_SCALE) endSwipe(e, g);
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    apply({ ...view, scale: clampScale(view.scale * Math.exp(-e.deltaY * 0.002)) });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') setView((v) => clampPan({ ...v, scale: clampScale(v.scale + 0.5) }, ref.current));
      else if (e.key === '-') setView((v) => clampPan({ ...v, scale: clampScale(v.scale - 0.5) }, ref.current));
      else if (e.key === '0') setView(RESET);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);

  return {
    ref,
    zoomed: view.scale > MIN_SCALE,
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
  };
}
