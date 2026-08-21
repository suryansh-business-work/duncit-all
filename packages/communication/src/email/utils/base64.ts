/**
 * Attachment encoding.
 *
 * Every HTTP email provider takes attachment bytes as base64, and this package
 * has no dependencies — no `Buffer`, because it must also work in a browser
 * bundle. `TextEncoder` + `btoa` are in Node and every browser.
 */

const BINARY_CHUNK = 0x8000;

/** Bytes to base64, in chunks so a large file cannot blow the argument limit. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += BINARY_CHUNK) {
    binary += String.fromCodePoint(...bytes.subarray(i, i + BINARY_CHUNK));
  }
  return globalThis.btoa(binary);
}

/**
 * Attachment content as base64, whether it arrived as bytes or as text.
 *
 * A string is encoded as UTF-8 first: `btoa` throws on anything above U+00FF,
 * so a CSV with a `₹` in it would fail at the last moment before sending.
 */
export function toBase64(content: Uint8Array | string): string {
  if (typeof content === 'string') return bytesToBase64(new TextEncoder().encode(content));
  return bytesToBase64(content);
}
