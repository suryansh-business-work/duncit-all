import { useCallback, useEffect, useRef, useState } from 'react';

export interface DeviceLists {
  mics: MediaDeviceInfo[];
  cams: MediaDeviceInfo[];
}

/**
 * Open the chosen microphone and camera so they can be tried before a call.
 *
 * Testing a device means actually opening it — there is no way to know a
 * microphone works without listening to it, and "it was muted in Windows" is
 * the single most common reason a call starts with nobody able to hear
 * anything. The preview stream is torn down on every change and on unmount:
 * a camera light left on after the dialog closes is alarming, and rightly so.
 */
export function useDeviceTest(micId: string, camId: string, open: boolean) {
  const [devices, setDevices] = useState<DeviceLists>({ mics: [], cams: [] });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<{ context: AudioContext; raf: number } | null>(null);

  /**
   * Labels are blank until a permission has been granted at least once — a
   * browser will not tell a page the name of a device it has never been
   * allowed to open — so the list is read again after the preview starts.
   */
  const refresh = useCallback(async () => {
    const all = await globalThis.navigator.mediaDevices?.enumerateDevices();
    if (!all) return;
    setDevices({
      mics: all.filter((device) => device.kind === 'audioinput'),
      cams: all.filter((device) => device.kind === 'videoinput'),
    });
  }, []);

  const stop = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    if (audio.current) {
      globalThis.cancelAnimationFrame(audio.current.raf);
      audio.current.context.close().catch(() => undefined);
      audio.current = null;
    }
    setLevel(0);
  }, []);

  /** Drive the level bar off the live microphone. */
  const meter = useCallback((source: MediaStream) => {
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor || source.getAudioTracks().length === 0) return;
    const context = new Ctor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(source).connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(bins);
      const total = bins.reduce((sum, value) => sum + value, 0);
      setLevel(Math.min(100, Math.round((total / bins.length / 255) * 300)));
      if (audio.current) audio.current.raf = globalThis.requestAnimationFrame(tick);
    };
    audio.current = { context, raf: globalThis.requestAnimationFrame(tick) };
  }, []);

  const start = useCallback(
    async (withVideo: boolean) => {
      stop();
      setError(null);
      try {
        const opened = await globalThis.navigator.mediaDevices.getUserMedia({
          audio: micId ? { deviceId: { exact: micId } } : true,
          video: withVideo && camId ? { deviceId: { exact: camId } } : withVideo,
        });
        setStream(opened);
        meter(opened);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not open that device');
      }
    },
    [micId, camId, stop, meter, refresh]
  );

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    refresh().catch(() => undefined);
    return stop;
  }, [open, refresh, stop]);

  return { devices, stream, level, error, start, stop, testing: Boolean(stream) };
}
