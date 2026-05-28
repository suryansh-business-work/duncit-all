/** Document toolbar actions (print, download, copy) kept pure + testable. */

/** Triggers a browser download of `contents` as a file. */
export function downloadFile(filename: string, contents: string, mime = 'text/html'): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Opens a print window for the given HTML. Returns false if the popup is blocked. */
export function printHtml(html: string): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

/** Copies text to the clipboard, resolving to whether it succeeded. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Builds a filesystem-safe filename from a document name. */
export function safeFileName(name: string, ext = 'html'): string {
  const base = (name || 'document')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'document'}.${ext}`;
}
