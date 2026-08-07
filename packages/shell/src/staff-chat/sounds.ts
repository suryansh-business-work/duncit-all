import pingUrl from '../media/chat-ping-new-message.mp3';
import ringUrl from '../media/audio-video-call-incoming.mp3';

/**
 * The two sounds this chat makes.
 *
 * Imported rather than fetched from a public folder: `@duncit/shell` is a
 * library, so a `public/` inside it is copied by nobody — an import is what
 * puts the file in each portal's build and gives it a hashed URL that cannot
 * 404. (Rule 39 says the same thing about icons, for the same reason.)
 *
 * Everything here is best-effort. A browser that blocks audio before the user
 * has interacted with the page is the normal case, not an error, and a sound
 * nobody hears must never cost the message that caused it.
 */

/** One short ping for an arriving message. */
export function playMessagePing(): void {
  try {
    const audio = new Audio(pingUrl);
    audio.volume = 0.6;
    audio.play().catch(() => undefined);
  } catch {
    // Best-effort.
  }
}

/**
 * The incoming-call ring, which repeats until the call is answered, declined
 * or rings out — so it hands back the stop.
 */
export function startRinging(): () => void {
  try {
    const audio = new Audio(ringUrl);
    audio.loop = true;
    audio.volume = 0.8;
    audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  } catch {
    return () => undefined;
  }
}

/**
 * The two-note tone a call makes when it ends.
 *
 * Synthesised rather than shipped as another mp3: it is two beeps, and an
 * oscillator costs nothing in the bundle, needs no network and cannot 404. It
 * also plays at the one moment a browser is guaranteed to allow audio — the
 * user just clicked Hang up.
 */
export function playCallEnded(): void {
  try {
    const Ctor = globalThis.AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!Ctor) return;
    const context = new Ctor();
    // Descending, because a call ending should not sound like a notification.
    [[520, 0], [400, 0.16]].forEach(([frequency, offset]) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      // Ramped, not switched: a square-edged gate on a sine is a click.
      gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.15);
      osc.connect(gain).connect(context.destination);
      osc.start(context.currentTime + offset);
      osc.stop(context.currentTime + offset + 0.16);
    });
    // Let it finish, then release the hardware.
    globalThis.setTimeout(() => context.close().catch(() => undefined), 600);
  } catch {
    // Best-effort, like every other sound here.
  }
}
