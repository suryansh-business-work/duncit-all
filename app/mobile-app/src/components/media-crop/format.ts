/** Human-readable file size, e.g. "648 KB" / "12.4 MB". Empty for unknown. */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Video length (expo-image-picker reports milliseconds) → "m:ss". Empty for none. */
export function formatDuration(durationMs?: number | null): string {
  if (!durationMs || durationMs <= 0) return '';
  const total = Math.round(durationMs / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export interface MediaDetails {
  fileName: string;
  mimeType: string;
  fileSize?: number | null;
  width: number;
  height: number;
  kind: 'image' | 'video';
  durationMs?: number | null;
}

/**
 * The list of detail chips shown in the upload dialog for both image and video:
 * type, size, resolution and (video) duration. Falsy entries are dropped so a
 * missing field never renders an empty chip.
 */
export function fileDetailChips(media: MediaDetails): string[] {
  const resolution = media.width > 0 && media.height > 0 ? `${media.width}×${media.height}px` : '';
  const chips = [media.mimeType, formatBytes(media.fileSize), resolution];
  if (media.kind === 'video') chips.push(formatDuration(media.durationMs));
  return chips.filter(Boolean);
}
