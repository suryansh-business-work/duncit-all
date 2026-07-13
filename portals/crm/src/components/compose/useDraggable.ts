import { useCallback, useEffect, useRef, useState } from 'react';

export interface DragOffset {
  x: number;
  y: number;
}

/**
 * Pointer-based drag for a floating panel. Returns the current offset (relative
 * to its CSS-anchored position) and a handler to attach to the drag handle.
 * Movement is clamped to the viewport so the window can never be lost off-screen.
 */
export function useDraggable(enabled: boolean) {
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const offsetRef = useRef<DragOffset>(offset);
  offsetRef.current = offset;

  const reset = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      // Ignore drags that start on a button (minimize/maximize/close).
      if ((e.target as HTMLElement).closest('button')) return;
      start.current = {
        px: e.clientX,
        py: e.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      };
    },
    [enabled]
  );

  // Listeners are attached once; the drag is active only while `start` is set.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.px;
      const dy = e.clientY - start.current.py;
      const max = 80;
      setOffset({
        x: Math.min(max, Math.max(-(window.innerWidth - 200), start.current.ox + dx)),
        y: Math.min(max, Math.max(-(window.innerHeight - 160), start.current.oy + dy)),
      });
    };
    const up = () => {
      start.current = null;
    };
    globalThis.addEventListener('pointermove', move);
    globalThis.addEventListener('pointerup', up);
    return () => {
      globalThis.removeEventListener('pointermove', move);
      globalThis.removeEventListener('pointerup', up);
    };
  }, []);

  return { offset, onPointerDown, reset };
}
