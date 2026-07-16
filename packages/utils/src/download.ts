/**
 * Browser save-as helpers. One copy of the base64 → Blob → anchor-click
 * download flow that was re-written across admin, finance, crm (twice),
 * support and legal.
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
