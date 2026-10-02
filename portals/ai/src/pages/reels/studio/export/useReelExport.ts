import { useCallback, useRef, useState } from 'react';
import { notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { downloadBlob } from '@duncit/utils';
import { ReelComposition } from '../../composition/ReelComposition';
import { reelDurationInFrames, sceneTimings } from '../../composition/timing';
import { remotionLicenseKey } from '../../license';
import type { ReelProject } from '../../types';
import { AssetDownloadError, downloadReelAssets } from './localAssets';

export type ExportState =
  | { phase: 'idle' }
  | { phase: 'downloading'; progress: number }
  | { phase: 'rendering'; progress: number }
  | { phase: 'failed'; message: string };

const IDLE: ExportState = { phase: 'idle' };

/** H.264 in an MP4: the one pairing every platform a reel is posted to accepts. */
const CONTAINER = 'mp4';
const VIDEO_CODEC = 'h264';

/** What the operator reads when an export fails. */
function failureMessage(error: unknown, t: (key: string, options?: { vars?: Record<string, string> }) => string): string {
  if (error instanceof AssetDownloadError) {
    return t('ai.reels.export.downloadFailed', { vars: { name: error.assetName } });
  }
  return error instanceof Error ? error.message : t('ai.reels.export.failed');
}

/** A file name out of the reel's name: lower-case words joined by dashes. */
function fileNameOf(name: string): string {
  const words = name.toLowerCase().split(/[^\da-z]+/).filter(Boolean);
  return `${words.join('-') || 'reel'}.${CONTAINER}`;
}

/**
 * Renders the reel to an MP4 in this browser tab and saves it.
 *
 * No server takes part: Remotion's web renderer draws the SAME composition the
 * player shows, frame by frame, and encodes it with the browser's own video
 * encoder (WebCodecs). That keeps a minutes-long encode off the API server —
 * which is also the production server — at the cost of needing a browser that
 * can encode H.264, which is checked before a single frame is drawn. The
 * footage is downloaded into the tab first (see `localAssets.ts`), so no frame
 * waits on Google Drive.
 *
 * The renderer is imported only when an export starts; it is a large module
 * and most visits to the studio never export.
 */
export function useReelExport(project: ReelProject) {
  const { t } = useTranslation();
  const [state, setState] = useState<ExportState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    const { spec, assets, name } = project;
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: 'rendering', progress: 0 });
    try {
      const { canRenderMediaOnWeb, renderMediaOnWeb } = await import('@remotion/web-renderer');
      const support = await canRenderMediaOnWeb({
        container: CONTAINER,
        videoCodec: VIDEO_CODEC,
        width: spec.width,
        height: spec.height,
      });
      if (!support.canRender) {
        const reason = support.issues.find((issue) => issue.severity === 'error')?.message;
        throw new Error(reason ?? t('ai.reels.export.unsupported'));
      }
      setState({ phase: 'downloading', progress: 0 });
      const local = await downloadReelAssets(assets, spec, controller.signal, (progress) =>
        setState({ phase: 'downloading', progress })
      );
      setState({ phase: 'rendering', progress: 0 });
      const inputProps = { spec, assets: local.assets };
      const result = await renderMediaOnWeb({
        composition: {
          id: 'reel',
          component: ReelComposition,
          width: spec.width,
          height: spec.height,
          fps: spec.fps,
          durationInFrames: reelDurationInFrames(sceneTimings(spec)),
          defaultProps: inputProps,
        },
        inputProps,
        container: CONTAINER,
        videoCodec: VIDEO_CODEC,
        signal: controller.signal,
        licenseKey: remotionLicenseKey,
        onProgress: ({ progress }) => setState({ phase: 'rendering', progress }),
      }).finally(local.release);
      downloadBlob(await result.getBlob(), fileNameOf(name));
      setState(IDLE);
      notifySuccess(t('ai.reels.export.done'));
    } catch (error) {
      // Cancelling is the operator's own choice, not something to report back to them.
      if (controller.signal.aborted) {
        setState(IDLE);
        return;
      }
      logs.portal.ai.error('reels', 'export', { error });
      setState({ phase: 'failed', message: failureMessage(error, t) });
    }
  }, [project, t]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const dismiss = useCallback(() => setState(IDLE), []);

  return { state, start, cancel, dismiss };
}

export type ReelExport = ReturnType<typeof useReelExport>;
