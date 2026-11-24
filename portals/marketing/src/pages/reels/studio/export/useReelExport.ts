import { useCallback, useRef, useState } from 'react';
import { notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { downloadBlob } from '@duncit/utils';
import { frameOf } from '../../composition/aspect';
import { ReelComposition } from '../../composition/ReelComposition';
import { reelDurationInFrames, sceneTimings } from '../../composition/timing';
import { exportDefaults, toRenderOptions, type ReelRenderOptions } from '../../../../forms/reel-export';
import { useRemotionLicenseKey } from '../../license';
import type { ReelProject } from '../../types';
import { AssetDownloadError, downloadReelAssets } from './localAssets';

export type ExportState =
  | { phase: 'idle' }
  | { phase: 'downloading'; progress: number }
  | { phase: 'rendering'; progress: number }
  /** Rendered and waiting on the operator: save it, or post it to social. */
  | { phase: 'rendered'; file: File }
  | { phase: 'failed'; message: string };

const IDLE: ExportState = { phase: 'idle' };

/** What the operator reads when an export fails. */
function failureMessage(error: unknown, t: (key: string, options?: { vars?: Record<string, string> }) => string): string {
  if (error instanceof AssetDownloadError) {
    return t('ai.reels.export.downloadFailed', { vars: { name: error.assetName } });
  }
  return error instanceof Error ? error.message : t('ai.reels.export.failed');
}

/** A file name out of the reel's name: lower-case words joined by dashes, then the file type. */
export function fileNameOf(name: string, container: string): string {
  const words = name.toLowerCase().split(/[^\da-z]+/).filter(Boolean);
  return `${words.join('-') || 'reel'}.${container}`;
}

/**
 * Renders the reel in this browser tab — an MP4 unless the export options chose
 * another file — and holds it for the operator to save, or to post to social.
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
  /** The options of the last export, so Try again renders the same file. */
  const lastOptions = useRef<ReelRenderOptions | undefined>(undefined);
  const licenseKey = useRemotionLicenseKey();

  /**
   * Render with the options the export form chose; without any, the defaults —
   * H.264 in an MP4 at high quality, the one file every network accepts.
   */
  const start = useCallback(async (chosen?: ReelRenderOptions) => {
    const { spec, assets, name } = project;
    const frame = frameOf(spec);
    const durationInFrames = reelDurationInFrames(sceneTimings(spec));
    const options = chosen ?? toRenderOptions(exportDefaults(durationInFrames / spec.fps), spec.fps, durationInFrames);
    lastOptions.current = chosen;
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: 'rendering', progress: 0 });
    try {
      const { canRenderMediaOnWeb, renderMediaOnWeb } = await import('@remotion/web-renderer');
      const support = await canRenderMediaOnWeb({
        container: options.container,
        videoCodec: options.videoCodec,
        audioCodec: options.audioCodec,
        width: frame.width,
        height: frame.height,
        scale: options.scale,
        muted: options.muted,
        videoBitrate: options.videoBitrate,
        audioBitrate: options.audioBitrate,
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
          width: frame.width,
          height: frame.height,
          fps: spec.fps,
          durationInFrames,
          defaultProps: inputProps,
        },
        inputProps,
        container: options.container,
        videoCodec: options.videoCodec,
        audioCodec: options.audioCodec,
        videoBitrate: options.videoBitrate,
        audioBitrate: options.audioBitrate,
        muted: options.muted,
        scale: options.scale,
        hardwareAcceleration: options.hardwareAcceleration,
        keyframeIntervalInSeconds: options.keyframeIntervalInSeconds,
        frameRange: options.frameRange,
        signal: controller.signal,
        licenseKey,
        onProgress: ({ progress }) => setState({ phase: 'rendering', progress }),
      }).finally(local.release);
      const blob = await result.getBlob();
      setState({ phase: 'rendered', file: new File([blob], fileNameOf(name, options.container), { type: options.mimeType }) });
    } catch (error) {
      // Cancelling is the operator's own choice, not something to report back to them.
      if (controller.signal.aborted) {
        setState(IDLE);
        return;
      }
      logs.portal.marketing.error('reels', 'export', { error });
      setState({ phase: 'failed', message: failureMessage(error, t) });
    }
  }, [project, t, licenseKey]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const dismiss = useCallback(() => setState(IDLE), []);
  /** The last export again, with the same options. */
  const retry = useCallback(() => start(lastOptions.current), [start]);

  /** Saves the rendered file to the operator's computer and closes the export. */
  const save = useCallback(() => {
    if (state.phase !== 'rendered') return;
    downloadBlob(state.file, state.file.name);
    setState(IDLE);
    notifySuccess(t('ai.reels.export.done'));
  }, [state, t]);

  return { state, start, retry, cancel, dismiss, save };
}

export type ReelExport = ReturnType<typeof useReelExport>;
