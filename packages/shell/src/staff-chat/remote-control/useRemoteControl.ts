import { useCallback, useRef, useState } from 'react';
import type { NormalisedPoint, RemoteMessage } from './protocol';
import type { Ripple, Stroke } from './ShareOverlay';

export type ControlState = 'NONE' | 'REQUESTED' | 'GRANTED';

/**
 * Replay one intent inside THIS page.
 *
 * The honest half of "remote control". A web page cannot move the operating
 * system's pointer or type into another tab — so a granted click is dispatched
 * at the document position under it, a keystroke goes to whatever this page has
 * focused, and a scroll moves this window. Inside a Duncit console that is
 * indistinguishable from being driven; outside one it simply stops, which is
 * the truth rather than a half-working illusion.
 */
function replay(message: RemoteMessage) {
  if (message.t === 'scroll') {
    globalThis.scrollTo({ left: message.x, top: message.y, behavior: 'auto' });
    return;
  }
  if (message.t === 'click') {
    const x = message.at.x * globalThis.innerWidth;
    const y = message.at.y * globalThis.innerHeight;
    const target = globalThis.document.elementFromPoint(x, y);
    if (!(target instanceof globalThis.HTMLElement)) return;
    // A real click sequence, so handlers watching mousedown/up behave.
    for (const type of ['mousedown', 'mouseup', 'click'] as const) {
      target.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y })
      );
    }
    return;
  }
  if (message.t === 'key') {
    const target = globalThis.document.activeElement;
    if (!(target instanceof globalThis.HTMLElement)) return;
    const init: KeyboardEventInit = {
      key: message.key,
      bubbles: true,
      cancelable: true,
      ctrlKey: message.ctrl,
      metaKey: message.meta,
      shiftKey: message.shift,
      altKey: message.alt,
    };
    target.dispatchEvent(new KeyboardEvent('keydown', init));
    // Printable keys also have to land in the field's value: a dispatched
    // keydown does not type, because it is not trusted.
    const field = target as HTMLInputElement;
    if (message.key.length === 1 && 'value' in field) {
      field.value = `${field.value ?? ''}${message.key}`;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    target.dispatchEvent(new KeyboardEvent('keyup', init));
  }
}

/**
 * The overlay's state, and the rule about who may drive.
 *
 * Control is asked for, granted and revoked explicitly, and only the SHARER
 * decides — nobody takes control of a screen by sending a message. That is
 * enforced here rather than in the UI, because a UI check is a suggestion.
 */
export function useRemoteControl(amSharing: { current: boolean }) {
  const [cursor, setCursor] = useState<NormalisedPoint | null>(null);
  const [cursorMode, setCursorMode] = useState<'POINTER' | 'LASER'>('POINTER');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  /** From the sharer's side: whether the viewer is driving. */
  const [theyControl, setTheyControl] = useState(false);
  /** From the viewer's side: whether I have been given control. */
  const [myControl, setMyControl] = useState<ControlState>('NONE');
  const [pendingRequest, setPendingRequest] = useState(false);
  const rippleId = useRef(0);
  // Read inside the receiver, which must not be rebuilt on every grant.
  const theyControlRef = useRef(false);
  theyControlRef.current = theyControl;

  const clear = useCallback(() => setStrokes([]), []);

  const receive = useCallback(
    (message: RemoteMessage) => {
      switch (message.t) {
        case 'cursor':
          setCursor(message.at);
          setCursorMode(message.mode);
          break;
        case 'draw':
          setStrokes((current) => {
            if (message.end || !message.at) return [...current, { points: [], colour: '#f44336' }];
            const last = current[current.length - 1];
            const point = message.at;
            if (!last || last.points.length === 0) {
              return [
                ...current.slice(0, -1),
                { points: [point], colour: message.colour ?? last?.colour ?? '#f44336' },
              ];
            }
            return [...current.slice(0, -1), { ...last, points: [...last.points, point] }];
          });
          break;
        case 'clear':
          setStrokes([]);
          break;
        case 'ping': {
          const id = (rippleId.current += 1);
          setRipples((current) => [...current, { id, at: message.at }]);
          globalThis.setTimeout(
            () => setRipples((current) => current.filter((r) => r.id !== id)),
            600
          );
          break;
        }
        case 'control-request':
          // Only meaningful to the person whose screen it is.
          if (amSharing.current) setPendingRequest(true);
          break;
        case 'control-grant':
          setMyControl('GRANTED');
          break;
        case 'control-revoke':
          setMyControl('NONE');
          setTheyControl(false);
          break;
        default:
          // click / key / scroll: obeyed only by the sharer, and only after
          // they granted it. A viewer receiving these ignores them.
          if (amSharing.current && theyControlRef.current) replay(message);
      }
    },
    [amSharing]
  );

  return {
    cursor,
    cursorMode,
    strokes,
    ripples,
    clear,
    receive,
    theyControl,
    setTheyControl,
    myControl,
    setMyControl,
    pendingRequest,
    setPendingRequest,
  };
}
