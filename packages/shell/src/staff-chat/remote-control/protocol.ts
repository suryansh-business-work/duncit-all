/**
 * What the two ends of a shared screen say to each other.
 *
 * Everything here rides the LiveKit data channel next to the video. One file,
 * because a protocol described in two places is a protocol that disagrees with
 * itself the first time somebody adds a message.
 *
 * WHAT THIS CAN AND CANNOT DO — the boundary is real and worth stating plainly:
 *
 * A web page cannot move the operating system's mouse, type into another tab,
 * or touch the browser's own chrome. No library changes that, LiveKit included;
 * it is the sandbox, not a missing feature. Anything claiming otherwise in a
 * browser is either an extension or a native agent.
 *
 * What IS possible, and what this does: the two people are both inside OUR
 * portals, which is code we control. So control is handed over by REPLAYING
 * intent inside the receiving app — a click at a document position, a scroll
 * offset, a keystroke into the focused field — and everything visual (cursor,
 * laser, drawing, click ripples) is drawn as an overlay on top. Within a
 * Duncit console that is indistinguishable from real control. Outside one, it
 * stops at the edge of the page, and the UI says so rather than pretending.
 */

/** Where something happened, as a FRACTION of the viewport. */
export interface NormalisedPoint {
  /** 0..1 across. */
  x: number;
  /** 0..1 down. */
  y: number;
}

export type RemoteMessage =
  /** Continuous pointer position — the live cursor and the laser both use it. */
  | { t: 'cursor'; at: NormalisedPoint; mode: 'POINTER' | 'LASER' }
  /** A stroke while drawing. `end` closes the current line. */
  | { t: 'draw'; at?: NormalisedPoint; colour?: string; end?: boolean }
  /** Wipe the annotations. */
  | { t: 'clear' }
  /** A ripple where the controller clicked, whether or not control was granted. */
  | { t: 'ping'; at: NormalisedPoint }
  /** Keep both viewports at the same place in the page. */
  | { t: 'scroll'; x: number; y: number }
  /** Asking to drive. */
  | { t: 'control-request' }
  /** Granted, or taken back. */
  | { t: 'control-grant' }
  | { t: 'control-revoke' }
  /** A real click, replayed by the sharer's app. Only obeyed while granted. */
  | { t: 'click'; at: NormalisedPoint }
  /** A keystroke, replayed into whatever the sharer's page has focused. */
  | { t: 'key'; key: string; ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean };

/**
 * Positions travel as fractions, never pixels.
 *
 * The two people are on different screens at different sizes and zoom levels; a
 * pixel coordinate would land somewhere else on the other end, and "somewhere
 * else" while somebody is driving is worse than nothing.
 */
export const toFraction = (clientX: number, clientY: number, box: DOMRect): NormalisedPoint => ({
  x: box.width > 0 ? (clientX - box.left) / box.width : 0,
  y: box.height > 0 ? (clientY - box.top) / box.height : 0,
});

export const toPixels = (point: NormalisedPoint, box: DOMRect) => ({
  x: box.left + point.x * box.width,
  y: box.top + point.y * box.height,
});

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * `Uint8Array<ArrayBuffer>`, not the default `Uint8Array<ArrayBufferLike>`:
 * TextEncoder is typed as possibly backed by a SharedArrayBuffer, and LiveKit's
 * publishData will not accept that. The copy pins the buffer type without
 * asserting anything that is not true.
 */
export const encodeRemote = (message: RemoteMessage): Uint8Array<ArrayBuffer> => {
  const encoded = encoder.encode(JSON.stringify(message));
  const buffer = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  buffer.set(encoded);
  return buffer;
};

/** Anything unparseable is dropped: a malformed frame must not take the call. */
export function decodeRemote(payload: Uint8Array): RemoteMessage | null {
  try {
    const parsed = JSON.parse(decoder.decode(payload)) as RemoteMessage;
    return parsed && typeof parsed.t === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/** Cursor frames at pointer speed would flood the channel; 20/second is plenty. */
export const CURSOR_INTERVAL_MS = 50;
