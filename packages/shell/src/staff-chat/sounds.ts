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
