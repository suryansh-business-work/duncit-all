/**
 * The identity-document rules — one cap, checked the same way on every surface.
 *
 * The server stores the uploaded URL only, so the size limit is a client-side
 * policy. Three copies of it is three chances for one surface to accept a file
 * the next one rejects.
 */

/** Identity documents over 4 MB are refused before the upload starts. */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;

/** What an identity document may be — an image or a PDF. */
export const DOCUMENT_ACCEPT = 'image/*,application/pdf';

/**
 * Byte length of a base64 payload.
 *
 * The native pickers report `size` for a gallery image but not always for a
 * document, so the base64 string is the fallback measure: every 4 characters
 * carry 3 bytes.
 */
export function base64ByteSize(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Whether a picked document exceeds the cap.
 *
 * `size` wins when the picker reported one; otherwise the base64 payload is
 * measured. Passing neither is treated as within the cap — a document with no
 * measurable size is the picker's failure, not the user's.
 */
export function isDocumentTooLarge(doc: Readonly<{ size?: number | null; base64?: string }>): boolean {
  if (typeof doc.size === 'number') return doc.size > MAX_DOC_BYTES;
  if (typeof doc.base64 === 'string') return base64ByteSize(doc.base64) > MAX_DOC_BYTES;
  return false;
}
