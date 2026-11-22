import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

export type FrameMode = 'normal' | 'minimized' | 'maximized';

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Window geometry limits, in CSS pixels. */
export const FRAME = { gutter: 16, minW: 300, minH: 260, defaultW: 420, defaultH: 600, step: 24 } as const;

const viewport = () => ({ vw: globalThis.innerWidth, vh: globalThis.innerHeight });

/** Keep the whole window on screen, never smaller than the minimum (or the screen, on a phone). */
export function clampRect(rect: FrameRect, vw: number, vh: number): FrameRect {
  const maxW = Math.max(vw - FRAME.gutter * 2, 0);
  const maxH = Math.max(vh - FRAME.gutter * 2, 0);
  const w = Math.min(Math.max(rect.w, Math.min(FRAME.minW, maxW)), maxW);
  const h = Math.min(Math.max(rect.h, Math.min(FRAME.minH, maxH)), maxH);
  const x = Math.min(Math.max(rect.x, FRAME.gutter), vw - w - FRAME.gutter);
  const y = Math.min(Math.max(rect.y, FRAME.gutter), vh - h - FRAME.gutter);
  return { x, y, w, h };
}

/** Bottom-right, like a chat or compose window. */
export function initialRect(vw: number, vh: number): FrameRect {
  const w = Math.min(FRAME.defaultW, vw - FRAME.gutter * 2);
  const h = Math.min(FRAME.defaultH, vh - FRAME.gutter * 2);
  return clampRect({ x: vw - w - FRAME.gutter, y: vh - h - FRAME.gutter, w, h }, vw, vh);
}

type Gesture = { kind: 'move' | 'resize'; px: number; py: number; start: FrameRect };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Geometry of a floating, non-modal window: dragged by its title bar,
 * resized from its corner, minimized to a compact bar, maximized to the
 * viewport and restored to exactly the size and place it had before. The
 * arrow keys on the focused title bar move it (Shift + arrows resize), so it
 * never depends on dragging alone. It stays fully on screen when the browser
 * window shrinks.
 */
export function useFloatingFrame() {
  const [rect, setRect] = useState<FrameRect>(() => initialRect(viewport().vw, viewport().vh));
  const [mode, setMode] = useState<FrameMode>('normal');
  const beforeMinimize = useRef<FrameMode>('normal');
  const gesture = useRef<Gesture | null>(null);

  const apply = useCallback((next: FrameRect) => {
    const { vw, vh } = viewport();
    setRect(clampRect(next, vw, vh));
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const dx = e.clientX - g.px;
      const dy = e.clientY - g.py;
      apply(g.kind === 'move' ? { ...g.start, x: g.start.x + dx, y: g.start.y + dy } : { ...g.start, w: g.start.w + dx, h: g.start.h + dy });
    };
    const up = () => {
      gesture.current = null;
    };
    const refit = () => setRect((current) => clampRect(current, viewport().vw, viewport().vh));
    globalThis.addEventListener('pointermove', move);
    globalThis.addEventListener('pointerup', up);
    globalThis.addEventListener('resize', refit);
    return () => {
      globalThis.removeEventListener('pointermove', move);
      globalThis.removeEventListener('pointerup', up);
      globalThis.removeEventListener('resize', refit);
    };
  }, [apply]);

  const begin = (kind: Gesture['kind']) => (e: React.PointerEvent) => {
    // Buttons in the title bar (minimize / maximize / close) are not drag starts.
    if (mode === 'maximized' || (e.target as HTMLElement).closest('button')) return;
    gesture.current = { kind, px: e.clientX, py: e.clientY, start: rect };
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const arrow = ARROWS[e.key];
    if (!arrow || mode === 'maximized' || e.target !== e.currentTarget) return;
    e.preventDefault();
    const [dx, dy] = arrow.map((v) => v * FRAME.step);
    apply(e.shiftKey && mode === 'normal' ? { ...rect, w: rect.w + dx, h: rect.h + dy } : { ...rect, x: rect.x + dx, y: rect.y + dy });
  };

  const toggleMinimize = () => {
    if (mode === 'minimized') {
      setMode(beforeMinimize.current);
      return;
    }
    beforeMinimize.current = mode;
    setMode('minimized');
  };

  // The rect is left untouched while maximized, which is what Restore returns to.
  const toggleMaximize = () => setMode((current) => (current === 'maximized' ? 'normal' : 'maximized'));

  return {
    rect,
    mode,
    onTitlePointerDown: begin('move'),
    onResizePointerDown: begin('resize'),
    onTitleKeyDown: onKeyDown,
    toggleMinimize,
    toggleMaximize,
  };
}
