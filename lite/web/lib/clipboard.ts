/** Copy text to the clipboard; false when the browser refuses (no permission, insecure context). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await globalThis.navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Share through the device sheet when there is one, else copy the link. Returns what happened. */
export async function shareOrCopy(title: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = globalThis.navigator;
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title, url });
      return 'shared';
    } catch {
      // The reader closed the sheet, or the browser refused: fall through to the clipboard.
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}
