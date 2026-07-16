import { downloadBase64File } from '@duncit/utils';
import type { TranscriptFormat } from '../graphql/supportChat';

const MIME: Record<TranscriptFormat, string> = {
  TXT: 'text/plain',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Saves a server-generated transcript ({ filename, content_base64 }) to disk. */
export function saveTranscript(
  transcript: { filename: string; content_base64: string },
  format: TranscriptFormat,
): void {
  downloadBase64File(transcript.content_base64, transcript.filename, MIME[format]);
}
