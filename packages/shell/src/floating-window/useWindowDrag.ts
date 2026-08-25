import { useCallback, useEffect, useRef, useState } from 'react';
import { tokens } from '@duncit/theme';

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_WIDTH = 320;
export const MIN_HEIGHT = 220;

/**
 * Keep a window on screen — a title bar dragged past the edge is unreachable.
 *
 * The floor is the top of the TASKBAR rather than the bottom of the viewport:
 * a window dropped over the bar would cover the button that brings it back.
 */
function clamp(rect: WindowRect): WindowRect {
  const floor = globalThis.innerHeight - tokens.size.taskbarHeight;
  const maxX = Math.max(0, globalThis.innerWidth - rect.width);
  const maxY = Math.max(0, floor - rect.height);
  return {
    width: Math.max(MIN_WIDTH, Math.min(rect.width, globalThis.innerWidth)),
    height: Math.max(MIN_HEIGHT, Math.min(rect.height, floor)),
    x: Math.max(0, Math.min(rect.x, maxX)),
    y: Math.max(0, Math.min(rect.y, maxY)),
  };
}

type Mode = 'MOVE' | 'RESIZE';

/**
 * Drag and resize, on pointer events.
 *
 * Pointer capture rather than window listeners: it keeps the gesture with the
 * element even when the cursor outruns it or crosses an iframe, which is
 * exactly what happens over a video. No dependency for what is forty lines of
 * arithmetic, and one less package for seventeen portals to carry.
 */
export function useWindowDrag(initial: WindowRect) {
  const [rect, setRect] = useState<WindowRect>(() => clamp(initial));
  const gesture = useRef<{ mode: Mode; startX: number; startY: number; from: WindowRect } | null>(
    null
  );

  const begin = useCallback(
    (mode: Mode) => (event: React.PointerEvent) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      gesture.current = { mode, startX: event.clientX, startY: event.clientY, from: rect };
    },
    [rect]
  );

  const move = useCallback((event: React.PointerEvent) => {
    const active = gesture.current;
    if (!active) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (active.mode === 'MOVE') {
      setRect(clamp({ ...active.from, x: active.from.x + dx, y: active.from.y + dy }));
      return;
    }
    setRect(
      clamp({ ...active.from, width: active.from.width + dx, height: active.from.height + dy })
    );
  }, []);

  const end = useCallback((event: React.PointerEvent) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    gesture.current = null;
  }, []);

  // A window sized for a wide monitor is off-screen on a narrow one.
  useEffect(() => {
    const onResize = () => setRect((current) => clamp(current));
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, []);

  return { rect, setRect, begin, move, end };
}
