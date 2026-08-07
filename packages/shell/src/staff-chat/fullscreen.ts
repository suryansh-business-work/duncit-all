/**
 * Take an element full screen, or come back from it.
 *
 * Its own module because it is a DOM concern rather than a call one, and
 * because both branches need guarding: `requestFullscreen` is absent on older
 * hosts and rejects outright when the click that asked for it has already been
 * consumed — neither is worth an error banner over a call.
 */
export function toggleFullscreen(node: HTMLElement | null): void {
  if (!node) return;
  if (globalThis.document.fullscreenElement) {
    globalThis.document.exitFullscreen().catch(() => undefined);
    return;
  }
  node.requestFullscreen?.().catch(() => undefined);
}
