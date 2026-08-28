import { useCallback, useEffect, useRef, useState } from 'react';

/** Best audio container the browser will give us, best first. */
const CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

const pickMimeType = (): string =>
  CANDIDATES.find((type) => globalThis.MediaRecorder?.isTypeSupported?.(type)) ?? '';

/** Enough bars to read the shape of a sentence without storing a waveform. */
const BAR_COUNT = 48;

export interface VoiceNote {
  blob: Blob;
  seconds: number;
  /** 0–1 loudness per slice, sampled while recording. */
  peaks: number[];
}

/**
 * Hold to record a voice note.
 *
 * The waveform is sampled AS IT RECORDS rather than decoded afterwards:
 * decoding an audio blob to draw it means holding the whole thing in memory
 * twice and a visible pause before the note can be sent. Reading the analyser
 * on the way past costs nothing and produces the same picture.
 */
export function useVoiceNote() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const peaks = useRef<number[]>([]);
  const audio = useRef<{ context: AudioContext; raf: number } | null>(null);
  const startedAt = useRef(0);

  /**
   * Release the analyser and the microphone.
   *
   * The stream is passed in by the stop path, which has already cleared the recorder
   * ref by the time it tears down — reading the ref there found nothing, so the
   * browser kept its recording indicator on after a note was sent. Unmount
   * still passes nothing and reads the live ref.
   */
  const teardown = useCallback((stream?: MediaStream) => {
    if (audio.current) {
      globalThis.cancelAnimationFrame(audio.current.raf);
      audio.current.context.close().catch(() => undefined);
      audio.current = null;
    }
    (stream ?? recorder.current?.stream)?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const watchLevel = useCallback((stream: MediaStream) => {
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const context = new Ctor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(bins);
      const total = bins.reduce((sum, value) => sum + value, 0);
      const loudness = Math.min(1, total / bins.length / 128);
      setLevel(loudness);
      peaks.current.push(loudness);
      if (audio.current) audio.current.raf = globalThis.requestAnimationFrame(tick);
    };
    audio.current = { context, raf: globalThis.requestAnimationFrame(tick) };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!globalThis.MediaRecorder) {
      setError('This browser cannot record audio.');
      return;
    }
    try {
      const stream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const media = new MediaRecorder(stream, {
        ...(mimeType && { mimeType }),
        // Speech, not music: 64 kbps opus is transparent for a voice and a
        // quarter the size of the browser's default.
        audioBitsPerSecond: 64_000,
      });
      chunks.current = [];
      peaks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recorder.current = media;
      media.start(250);
      startedAt.current = Date.now();
      setSeconds(0);
      watchLevel(stream);
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the microphone');
    }
  }, [watchLevel]);

  // A clock while it runs, so the person can see how long they have talked.
  useEffect(() => {
    if (!recording) return;
    const id = globalThis.setInterval(
      () => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)),
      500
    );
    return () => globalThis.clearInterval(id);
  }, [recording]);

  /** Stop and hand back the note, or null when it was cancelled or empty. */
  const stop = useCallback(
    async (keep: boolean): Promise<VoiceNote | null> => {
      const media = recorder.current;
      if (!media) return null;
      const finished = new Promise<Blob>((resolve) => {
        media.onstop = () =>
          resolve(new Blob(chunks.current, { type: media.mimeType || 'audio/webm' }));
      });
      media.stop();
      recorder.current = null;
      setRecording(false);

      const blob = await finished;
      const took = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      teardown(media.stream);
      setLevel(0);
      if (!keep || blob.size === 0) return null;
      return { blob, seconds: took, peaks: condense(peaks.current, BAR_COUNT) };
    },
    [teardown]
  );

  return { recording, seconds, level, error, start, stop };
}

/**
 * Reduce however many samples were taken to a fixed number of bars.
 *
 * A twenty-second note and a two-second one have to draw the same width, so the
 * bar count is fixed and the samples are averaged into buckets.
 */
export function condense(samples: number[], bars: number): number[] {
  if (samples.length === 0) return new Array(bars).fill(0);
  const size = samples.length / bars;
  const out: number[] = [];
  for (let index = 0; index < bars; index += 1) {
    const from = Math.floor(index * size);
    const to = Math.max(from + 1, Math.floor((index + 1) * size));
    const slice = samples.slice(from, to);
    const total = slice.reduce((sum, value) => sum + value, 0);
    out.push(Number((total / slice.length).toFixed(3)));
  }
  return out;
}
