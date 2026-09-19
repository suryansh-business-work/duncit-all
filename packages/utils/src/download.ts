/**
 * Browser save-as and print helpers. One copy of the base64 → Blob →
 * anchor-click download flow that was re-written across admin, finance, crm
 * (twice), support and legal — and of printing a fetched file in place.
 */

/** Decodes a base64 string into a binary Blob of the given mime type. */
export function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    /* v8 ignore next -- codePointAt is always defined for i < length */
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return new Blob([bytes], { type: mime });
}

/** Triggers a browser save-as of the Blob under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Decodes a base64 payload and saves it as `filename` with the given mime type. */
export function downloadBase64File(base64: string, filename: string, mime: string): void {
  downloadBlob(base64ToBlob(base64, mime), filename);
}

/** Saves a plain string (HTML, text, CSV, …) as a file. */
export function downloadTextFile(contents: string, filename: string, mime = 'text/html'): void {
  downloadBlob(new Blob([contents], { type: mime }), filename);
}

/** The hidden frame the last printed file loaded into, and its object URL. */
let printed: { frame: HTMLIFrameElement; url: string } | null = null;

/**
 * Opens the browser's print dialog for a Blob (a PDF, say) without leaving the
 * page: the file loads into a hidden same-origin frame, which prints once it
 * has loaded. A frame cannot print a cross-origin link, which is why the bytes
 * are fetched first. The frame stays until the next print — removing it while
 * the dialog is open cancels the job in some browsers.
 */
export function printBlob(blob: Blob, title: string): void {
  if (printed) {
    printed.frame.remove();
    URL.revokeObjectURL(printed.url);
  }
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  frame.addEventListener('load', () => {
    const view = frame.contentWindow;
    if (!view) return;
    view.focus();
    view.print();
  });
  frame.src = url;
  document.body.appendChild(frame);
  printed = { frame, url };
}

/** Decodes a base64 payload and opens the print dialog for it. */
export function printBase64File(base64: string, mime: string, title: string): void {
  printBlob(base64ToBlob(base64, mime), title);
}
