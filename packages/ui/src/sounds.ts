import pingUrl from './media/chat-ping-new-message.mp3';

/**
 * One short ping for an arriving chat message — the portals' staff chat and
 * mWeb's pod and club rooms make the same sound.
 *
 * Imported rather than fetched from a public folder: a package's `public/` is
 * copied by nobody, while an import puts the file in each app's build with a
 * hashed URL that cannot 404.
 *
 * Best-effort. A browser that blocks audio before the user has interacted with
 * the page is the normal case, not an error, and a sound nobody hears must
 * never cost the message that caused it.
 */
export function playMessagePing(): void {
  try {
    const audio = new Audio(pingUrl);
    audio.volume = 0.6;
    audio.play().catch(() => undefined);
  } catch {
    // Best-effort.
  }
}
