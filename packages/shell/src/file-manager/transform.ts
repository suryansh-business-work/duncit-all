/**
 * ImageKit serves variants by URL, not by re-uploading.
 *
 * A thumbnail is a query parameter on the same file, so the grid can show a
 * 240px tile of a 4MB original without either storing a second copy or making
 * the browser fetch the whole thing.
 */

/** A small, cheap version for a tile or a preview. */
export function thumbUrl(url: string, size = 240): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}tr=w-${size},h-${size},c-maintain_ratio`;
}

/**
 * The same file, but saved rather than opened.
 *
 * ImageKit's own attachment flag, not the `download` attribute: browsers ignore
 * that one across origins, so the file would open in a tab and the button would
 * quietly do the wrong thing.
 */
export function downloadUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ik-attachment=true`;
}
