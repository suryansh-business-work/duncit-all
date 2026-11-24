import { useCallback, useMemo, useState } from 'react';
import { logs, fireAndForget } from '@duncit/logs';
import { toRenderOptions, type ReelExportFormValues } from '../../../../forms/reel-export';
import { reelDurationInFrames, sceneTimings } from '../../composition/timing';
import type { ReelSpec } from '../../types';
import type { ReelExport } from './useReelExport';

/**
 * The step before an export: the options dialog. Export opens it; Start hands
 * the chosen options to the renderer and keeps them, so the next export of
 * this session opens on the same choices.
 */
export function useExportOptions(exporter: ReelExport, spec: ReelSpec) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ReelExportFormValues | undefined>(undefined);
  const durationInFrames = useMemo(() => reelDurationInFrames(sceneTimings(spec)), [spec]);
  const durationS = durationInFrames / spec.fps;

  const submit = useCallback(
    (chosen: ReelExportFormValues) => {
      setValues(chosen);
      setOpen(false);
      fireAndForget(exporter.start(toRenderOptions(chosen, spec.fps, durationInFrames)), logs.portal.marketing, 'reels', 'export');
    },
    [exporter, spec.fps, durationInFrames]
  );

  return {
    open,
    durationS,
    // A reel shortened since the last export must not reopen on a stretch it no longer has.
    values: values && values.to_s <= durationS ? values : undefined,
    show: useCallback(() => setOpen(true), []),
    close: useCallback(() => setOpen(false), []),
    submit,
  };
}
