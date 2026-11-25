/**
 * A picked file's bytes as base64 (no `data:` prefix) — what the CRM's Excel
 * import takes, the same as the portal's fileToBase64. React Native reads a
 * local file:// or content:// URI through fetch, and FileReader encodes it.
 */
export async function readFileBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}
