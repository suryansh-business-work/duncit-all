import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useWavesurfer } from '@wavesurfer/react';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';

/**
 * Live speech wave rendered with @wavesurfer/react. While the call is active we
 * register the wavesurfer Record plugin and visualise the agent's microphone in
 * real time (no recording is kept). Mic permission is optional — if denied, the
 * wave simply stays flat instead of erroring.
 */
export default function CallWave({ active, color = '#6366f1' }: Readonly<{ active: boolean; color?: string }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 44,
    waveColor: color,
    progressColor: color,
    cursorWidth: 0,
    barWidth: 3,
    barGap: 2,
    barRadius: 3,
    interact: false,
  });

  useEffect(() => {
    if (!wavesurfer || !active) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let record: any = null;
    try {
      record = wavesurfer.registerPlugin(
        RecordPlugin.create({ renderRecordedAudio: false, scrollingWaveform: true })
      );
      record.startMic?.().catch(() => {
        /* mic denied / unavailable — leave the wave flat */
      });
    } catch {
      /* plugin failed to init — non-fatal */
    }
    return () => {
      try {
        record?.stopMic();
      } catch {
        /* already stopped */
      }
      try {
        record?.destroy();
      } catch {
        /* already destroyed */
      }
    };
  }, [wavesurfer, active]);

  return <Box ref={containerRef} sx={{ width: '100%', minHeight: 44, opacity: active ? 1 : 0.4 }} />;
}
