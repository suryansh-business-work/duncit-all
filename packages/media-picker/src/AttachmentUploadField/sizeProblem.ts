import { isVideoUpload } from '../attachment';
import { MB } from '../utils';

interface SizeGate {
  /** Images and documents; null = no client-side cap. */
  maxBytes: number | null;
  videoMaxBytes: number | null;
  oversizeMessage?: (file: File) => string;
  videoOversizeMessage?: string;
}

/** A file is judged by the cap for ITS kind, never by a single number for
 * all three — that is how a photo ended up sharing a document ceiling. */
export function sizeProblem(file: File, gate: Readonly<SizeGate>): string | null {
  if (isVideoUpload(file.name, file.type)) {
    if (gate.videoMaxBytes == null || file.size <= gate.videoMaxBytes) return null;
    const mb = Math.round(gate.videoMaxBytes / MB);
    return gate.videoOversizeMessage ?? `Video is too large (max ${mb} MB)`;
  }
  if (gate.maxBytes == null || file.size <= gate.maxBytes) return null;
  if (gate.oversizeMessage) return gate.oversizeMessage(file);
  const mb = Math.round(gate.maxBytes / MB);
  return `${file.name} is too large (max ${mb} MB)`;
}
