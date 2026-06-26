import type { TranscriptFormat } from '../graphql/supportChat';

const MIME: Record<TranscriptFormat, string> = {
  TXT: 'text/plain',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Decodes a base64 server transcript into a binary Blob (handles utf-8 + docx). */
function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return new Blob([bytes], { type: mime });
}

/** Saves a server-generated transcript ({ filename, content_base64 }) to disk. */
export function saveTranscript(
  transcript: { filename: string; content_base64: string },
  format: TranscriptFormat,
): void {
  const blob = base64ToBlob(transcript.content_base64, MIME[format]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = transcript.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
