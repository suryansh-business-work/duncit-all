import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { directUploadToImagekit } from '@duncit/media-picker';
import { START_VIDEO_COMPRESSION, VIDEO_COMPRESSION_JOB } from './queries';

export type RecordStage = 'IDLE' | 'RECORDING' | 'UPLOADING' | 'CONVERTING' | 'READY' | 'FAILED';

/** Its own folder in the media library, so recordings are findable as a set. */
const RECORDING_FOLDER = '/call-recordings';

/** What the recorder needs from the call it is recording. */
export interface CallSource {
  connected: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

/** What the browser will actually give us, best first. */
const VIDEO_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

/** An audio call has no video track, and a video container asked for one. */
const AUDIO_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

const pickMimeType = (hasVideo: boolean): string => {
  const candidates = hasVideo ? VIDEO_CANDIDATES : AUDIO_CANDIDATES;
  return candidates.find((type) => globalThis.MediaRecorder?.isTypeSupported?.(type)) ?? '';
};

/**
 * Record a call, and end up with an mp4.
 *
 * `MediaRecorder` writes webm nearly everywhere — mp4 output is not something a
 * browser can be relied on for — so the recording is taken in whatever the
 * browser gives, uploaded, and handed to the FFmpeg pipeline this server
 * already runs for pod videos. That pipeline transcodes to H.264/AAC with
 * `+faststart` and puts the result back in ImageKit, which is exactly what was
 * wanted: an mp4, stored, downloadable. No second FFmpeg, no second uploader.
 *
 * The tracks are MIXED here rather than recorded separately: a call is two
 * people, and two files nobody can line up is not a recording of a conversation.
 */
export function useCallRecorder(call: Readonly<CallSource>) {
  const client = useApolloClient();
  const [stage, setStage] = useState<RecordStage>('IDLE');
  const [pct, setPct] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mixer = useRef<AudioContext | null>(null);

  /**
   * One stream carrying both people.
   *
   * The video is whichever side has one (the remote, so the recording is of
   * THEM); the audio is both microphones summed through a Web Audio graph,
   * because a MediaStream can only carry one audio track and a recording with
   * half the conversation in it is worse than none.
   */
  const mix = useCallback((local: MediaStream | null, remote: MediaStream | null) => {
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const tracks: MediaStreamTrack[] = [];

    const video = remote?.getVideoTracks()[0] ?? local?.getVideoTracks()[0];
    if (video) tracks.push(video);

    if (Ctor) {
      const context = new Ctor();
      const destination = context.createMediaStreamDestination();
      for (const source of [local, remote]) {
        const audio = source?.getAudioTracks()[0];
        if (!audio) continue;
        context.createMediaStreamSource(new MediaStream([audio])).connect(destination);
      }
      mixer.current = context;
      const mixed = destination.stream.getAudioTracks()[0];
      if (mixed) tracks.push(mixed);
    }

    return new MediaStream(tracks);
  }, []);

  const start = useCallback(
    (local: MediaStream | null, remote: MediaStream | null) => {
      setError(null);
      setUrl(null);
      if (!globalThis.MediaRecorder) {
        setError('This browser cannot record.');
        return;
      }
      try {
        const stream = mix(local, remote);
        if (stream.getTracks().length === 0) {
          setError('There is nothing to record yet.');
          return;
        }
        const mimeType = pickMimeType(stream.getVideoTracks().length > 0);
        const media = new MediaRecorder(stream, {
          ...(mimeType && { mimeType }),
          // Capped rather than left to the browser's default, which is chosen
          // for archival quality and produces a file the person then has to
          // upload over their own connection. A call is faces and slides, and
          // the server re-encodes at CRF 28 afterwards anyway — spending
          // 2.5 Mbps to make bytes that get thrown away costs upload time
          // and nothing else.
          videoBitsPerSecond: 1_200_000,
          audioBitsPerSecond: 96_000,
        });
        chunks.current = [];
        media.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.current.push(event.data);
        };
        recorder.current = media;
        // A timeslice, so a crash mid-call still leaves the chunks so far
        // rather than one blob that was never flushed.
        media.start(2000);
        setStage('RECORDING');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start recording');
        setStage('FAILED');
      }
    },
    [mix]
  );

  /** Poll the transcode until it produces the mp4. */
  const awaitMp4 = useCallback(
    async (jobId: string): Promise<string> => {
      for (let tries = 0; tries < 150; tries += 1) {
        const res = await client.query({
          query: VIDEO_COMPRESSION_JOB,
          variables: { jobId },
          fetchPolicy: 'network-only',
        });
        const job = res.data?.videoCompressionJob;
        if (job?.status === 'DONE' && job.url) return job.url as string;
        if (job?.status === 'FAILED') throw new Error(job.error ?? 'Conversion failed');
        setPct(Number(job?.pct) || 0);
        await new Promise((resolve) => {
          globalThis.setTimeout(resolve, 2000);
        });
      }
      throw new Error('Conversion is taking too long');
    },
    [client]
  );

  const stop = useCallback(async () => {
    const media = recorder.current;
    if (!media) return;
    // The last chunk only exists after onstop, so the blob is assembled there.
    const finished = new Promise<Blob>((resolve) => {
      media.onstop = () => resolve(new Blob(chunks.current, { type: media.mimeType || 'video/webm' }));
    });
    media.stop();
    recorder.current = null;

    const blob = await finished;
    // Closed only once the last chunk is out: tearing the mixer down first
    // takes the audio track with it and truncates the tail.
    mixer.current?.close().catch(() => undefined);
    mixer.current = null;

    if (blob.size === 0) {
      setStage('IDLE');
      return;
    }

    try {
      setStage('UPLOADING');
      setPct(0);
      const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
      const file = new File([blob], `call-${stamp}.webm`, { type: blob.type });
      const raw = await directUploadToImagekit(client, file, RECORDING_FOLDER, setPct);

      setStage('CONVERTING');
      setPct(0);
      const job = await client.mutate({
        mutation: START_VIDEO_COMPRESSION,
        variables: { remoteUrl: raw, folder: RECORDING_FOLDER, surface: 'PORTALS' },
      });
      const jobId = job.data?.startVideoCompression?.job_id;
      if (!jobId) throw new Error('Conversion did not start');

      const mp4 = await awaitMp4(jobId);
      setUrl(mp4);
      setStage('READY');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the recording');
      setStage('FAILED');
    }
  }, [client, awaitMp4]);

  const reset = useCallback(() => {
    setStage('IDLE');
    setUrl(null);
    setError(null);
    setPct(0);
  }, []);

  const recording = stage === 'RECORDING';

  /**
   * Hanging up ends the take.
   *
   * The tracks are gone the moment the call closes, so a recorder left running
   * would keep writing nothing. Stopping here makes "hang up" a perfectly good
   * way to finish a recording — which is how people actually end calls.
   */
  useEffect(() => {
    if (!call.connected && recording) stop().catch(() => undefined);
  }, [call.connected, recording, stop]);

  const toggle = useCallback(() => {
    if (recording) {
      stop().catch(() => undefined);
      return;
    }
    start(call.localStream, call.remoteStream);
  }, [recording, stop, start, call.localStream, call.remoteStream]);

  return { stage, pct, url, error, recording, toggle, reset };
}
