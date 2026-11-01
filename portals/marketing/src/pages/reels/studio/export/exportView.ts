import type { ExportState } from './useReelExport';
import type { PostState } from './useReelPost';

/**
 * What the export dialog shows, read off the two machines behind it: the
 * render, and the upload that runs on a rendered reel. Pure, so the dialog is
 * one switch and the states are provable without a render.
 */
export type ExportView =
  | { kind: 'hidden' }
  | { kind: 'busy'; percent: number; statusKey: string; labelKey: string; cancellable: boolean }
  /** Rendered and waiting on the operator: save it, or post it. */
  | { kind: 'ready'; file: File }
  /** `file` is the rendered reel when the upload failed, so it can be tried again or still saved. */
  | { kind: 'failed'; message: string; file: File | null };

type BusyPhase = 'downloading' | 'rendering' | 'uploading';

const STATUS: Record<BusyPhase, string> = {
  downloading: 'ai.reels.export.downloading',
  rendering: 'ai.reels.export.progress',
  uploading: 'ai.reels.export.uploading',
};

/** The render can be cancelled; the upload, once its bytes are on the wire, cannot. */
const busy = (phase: BusyPhase, progress: number): ExportView => ({
  kind: 'busy',
  percent: Math.round(progress * 100),
  statusKey: STATUS[phase],
  labelKey: phase === 'uploading' ? 'ai.reels.export.uploadProgressLabel' : 'ai.reels.export.progressLabel',
  cancellable: phase !== 'uploading',
});

function viewOfPost(file: File, posting: PostState): ExportView {
  if (posting.phase === 'uploading') return busy('uploading', posting.progress);
  if (posting.phase === 'failed') return { kind: 'failed', message: posting.message, file };
  return { kind: 'ready', file };
}

export function exportView(render: ExportState, posting: PostState): ExportView {
  if (render.phase === 'idle') return { kind: 'hidden' };
  if (render.phase === 'failed') return { kind: 'failed', message: render.message, file: null };
  if (render.phase === 'rendered') return viewOfPost(render.file, posting);
  return busy(render.phase, render.progress);
}
