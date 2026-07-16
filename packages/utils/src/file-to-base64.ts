/**
 * FileReader helpers — one copy of the file → base64/data-URL reader that was
 * re-implemented 8× across the portals (and once inside @duncit/media-picker).
 *
 * Two behavioral families exist on purpose:
 * - `fileToDataUrl` resolves the FULL `data:<mime>;base64,...` URL
 *   (support / website-app / mweb / media-picker upload payloads).
 * - `fileToBase64` resolves the BARE base64 (prefix stripped — crm / finance
 *   upload payloads). Pick the one your server call already used.
 */

/** Reads a File into a full `data:<mime>;base64,...` URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Could not read selected file'));
    };
    reader.readAsDataURL(file);
  });
}

/** Reads a File into a bare base64 string (without the `data:<mime>;base64,` prefix). */
export async function fileToBase64(file: File): Promise<string> {
  const result = await fileToDataUrl(file);
  const comma = result.indexOf(',');
  if (comma >= 0) {
    return result.slice(comma + 1);
  }
  return result;
}
