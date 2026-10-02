import { PreviewBody } from './PreviewBody';
import type { StatusVideoPreviewSheetProps } from './types';

/** Preview a picked story video before posting (Bug 3). Clips over the 15s cap
 * must pick a 15s window (stepper seek; the server cuts the video during the
 * FFmpeg pass) before they can post. Mirrors mWeb's StatusVideoPreviewDialog. */
export function StatusVideoPreviewSheet({
  video,
  onCancel,
  onConfirm,
}: Readonly<StatusVideoPreviewSheetProps>) {
  // The body owns the player, so it is mounted only while there is a video —
  // which is also what gates the dialog.
  if (!video) return null;
  return <PreviewBody video={video} onCancel={onCancel} onConfirm={onConfirm} />;
}
