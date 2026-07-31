/**
 * Copy text to the clipboard, reporting whether it worked.
 *
 * Four portals had each hand-rolled `navigator.clipboard.writeText` with their
 * own try/catch (legal, developers, crm ×2). This is the one copy — the
 * clipboard API is unavailable on insecure origins and rejects when the
 * document is not focused, and every call site needs to know that rather than
 * show a "Copied!" toast for something that never landed.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
