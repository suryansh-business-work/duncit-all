/**
 * A short two-tone beep, synthesised rather than played from a file.
 *
 * Web Audio means no asset to ship, no request to make and nothing to 404 —
 * which matters for a sound whose whole job is to arrive at the same moment as
 * the message that caused it.
 *
 * Best-effort throughout. A browser that blocks audio before the user has
 * interacted with the page is the normal case, not an error, and a notification
 * nobody hears must never cost the notification itself.
 */
export function playNotificationBeep(): void {
  try {
    const Ctx =
      (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tone = (when: number, freq: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      // Ramped rather than switched: a square-edged gain change clicks.
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + dur + 0.02);
    };
    tone(0, 880, 0.18);
    tone(0.22, 660, 0.22);
    // Contexts are a limited resource; a page that beeps all day would run out.
    globalThis.setTimeout(() => {
      ctx.close().catch(() => undefined);
    }, 800);
  } catch {
    // Audio is best-effort.
  }
}
