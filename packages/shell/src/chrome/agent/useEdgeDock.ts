import { useCallback, useEffect, useRef, useState } from 'react';
import { tokens } from '@duncit/theme';
import type { AgentDock, DockEdge } from '../../workspace';

/** How tall the tab is. Its own height is what keeps it clear of both ends. */
export const DOCK_TAB_HEIGHT = 112;

/** A pointer that moved less than this never meant to drag — it meant to click. */
const DRAG_SLOP = 4;

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

/** The travel available to the tab: the viewport, less the taskbar and itself. */
function travel(): number {
  return Math.max(0, globalThis.innerHeight - tokens.size.taskbarHeight - DOCK_TAB_HEIGHT);
}

/** Where a pointer at (x, y) would leave the tab. */
function dockAt(x: number, y: number): AgentDock {
  const room = travel();
  const edge: DockEdge = x > globalThis.innerWidth / 2 ? 'RIGHT' : 'LEFT';
  return { edge, offset: room === 0 ? 0 : clamp01((y - DOCK_TAB_HEIGHT / 2) / room) };
}

export interface EdgeDockHandle {
  /** Where to draw the tab right now — the live drag, or the saved position. */
  dock: AgentDock;
  /** Distance from the top of the viewport, in px. */
  top: number;
  dragging: boolean;
  handlers: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
    onPointerCancel: (event: React.PointerEvent) => void;
  };
}

/**
 * Drag a tab along the edge of the viewport, on pointer events.
 *
 * Pointer capture rather than window listeners, for the same reason the call
 * window uses it: the gesture stays with the element even when the cursor
 * outruns it or crosses an iframe. No dependency for what is forty lines of
 * arithmetic, and one less package for seventeen consoles to carry.
 *
 * The position is stored as a FRACTION of the available travel, so the same
 * person reading a console on a laptop and on a 4K monitor finds the tab in the
 * same place on both. Crossing the middle of the screen switches which edge it
 * is stuck to — there is nothing to aim at, you simply drag it over.
 *
 * A press that never moves is a click: `onClick` still fires, because the
 * gesture only claims the pointer once it has travelled past the slop.
 */
export function useEdgeDock(saved: AgentDock, onCommit: (next: AgentDock) => void): EdgeDockHandle {
  const [live, setLive] = useState<AgentDock | null>(null);
  // A tab placed on a tall monitor is off the bottom of a short one, so the
  // travel is state and the resize recomputes it.
  const [room, setRoom] = useState(travel);

  useEffect(() => {
    const onResize = () => setRoom(travel());
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, []);
  const gesture = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    gesture.current = { startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const active = gesture.current;
    if (!active) return;
    const far =
      Math.abs(event.clientX - active.startX) > DRAG_SLOP ||
      Math.abs(event.clientY - active.startY) > DRAG_SLOP;
    if (!active.moved && !far) return;
    active.moved = true;
    // Only once it IS a drag: before that, preventing the default would eat the
    // click the press was going to become.
    event.preventDefault();
    setLive(dockAt(event.clientX, event.clientY));
  }, []);

  const finish = useCallback(
    (event: React.PointerEvent) => {
      const active = gesture.current;
      gesture.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (!active?.moved) return;
      const next = dockAt(event.clientX, event.clientY);
      setLive(null);
      onCommit(next);
    },
    [onCommit]
  );

  const dock = live ?? saved;
  return {
    dock,
    top: Math.round(dock.offset * room),
    dragging: live !== null,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
