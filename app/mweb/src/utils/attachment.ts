/**
 * Classify a support attachment from its URL alone (attachments are stored as
 * bare ImageKit URLs, no metadata). Drives type-aware rendering: image
 * thumbnail vs video preview vs document card, plus a human file name + type.
 */
export type AttachmentKind = 'image' | 'video' | 'doc';

export interface AttachmentInfo {
  url: string;
  /** File name derived from the URL basename (query stripped). */
  name: string;
  /** Lower-case extension without the dot, '' when none. */
  ext: string;
  kind: AttachmentKind;
}

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'heic']);
const VIDEO_EXT = new Set(['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v', '3gp']);

/** Short, human label for the file type shown on a document card. */
export function typeLabel(ext: string): string {
  return ext ? ext.toUpperCase() : 'FILE';
}

/**
 * True when a picked file is a video by MIME OR by extension. Browsers report an
 * empty/generic MIME for less-common containers (.mkv/.ts/.flv), so the
 * extension is a needed fallback to apply the tighter 50 MB video cap.
 */
export function isVideoUpload(fileName: string, mimeType: string): boolean {
  return /^video\//i.test(mimeType) || describeAttachment(fileName).kind === 'video';
}

export function describeAttachment(url: string): AttachmentInfo {
  const q = url.indexOf('?');
  const path = q >= 0 ? url.slice(0, q) : url;
  const base = path.slice(path.lastIndexOf('/') + 1);
  const name = decodeURIComponent(base) || 'Attachment';
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  let kind: AttachmentKind = 'doc';
  if (IMAGE_EXT.has(ext)) {
    kind = 'image';
  } else if (VIDEO_EXT.has(ext)) {
    kind = 'video';
  }
  return { url, name, ext, kind };
}
