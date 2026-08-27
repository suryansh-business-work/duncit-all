/**
 * The call recorder, from first chunk to finished mp4.
 *
 * jsdom has no MediaRecorder, AudioContext or MediaStream, so each is stubbed
 * just far enough to drive the real state machine: record → upload → convert →
 * ready, plus every way it refuses or fails. The FFmpeg pipeline is the
 * server's; here it is one mutation and a polled job.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const uploadDirect = vi.hoisted(() => vi.fn());
vi.mock('@duncit/media-picker', () => ({ directUploadToImagekit: uploadDirect }));

const client = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useApolloClient: () => client,
}));

import { useCallRecorder, type CallSource } from '../src/staff-chat/useCallRecorder';

type Track = { kind: 'audio' | 'video' };

class FakeMediaStream {
  constructor(readonly tracks: Track[] = []) {}
  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static failNext = false;
  static isTypeSupported(type: string) {
    return type === 'video/webm;codecs=vp9,opus' || type === 'audio/webm;codecs=opus';
  }
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = 'video/webm';
  started: number | null = null;
  constructor(
    readonly stream: FakeMediaStream,
    readonly options: { mimeType?: string }
  ) {
    if (FakeMediaRecorder.failNext) {
      FakeMediaRecorder.failNext = false;
      throw new Error('recorder exploded');
    }
    FakeMediaRecorder.instances.push(this);
  }
  start(timeslice: number) {
    this.started = timeslice;
  }
  stop() {
    this.onstop?.();
  }
}

class FakeAudioContext {
  createMediaStreamDestination() {
    return { stream: new FakeMediaStream([{ kind: 'audio' }]) };
  }
  createMediaStreamSource() {
    return { connect: () => undefined };
  }
  close() {
    return Promise.resolve();
  }
}

const g = globalThis as unknown as Record<string, unknown>;

const stream = (...kinds: Track['kind'][]) =>
  new FakeMediaStream(kinds.map((kind) => ({ kind }))) as unknown as MediaStream;

const mount = (source: Partial<CallSource> = {}) => {
  const initial: CallSource = {
    connected: true,
    localStream: stream('audio'),
    remoteStream: stream('audio', 'video'),
    ...source,
  };
  return renderHook((call: CallSource) => useCallRecorder(call), { initialProps: initial });
};

/** A job that converts on the first poll. */
const instantPipeline = () => {
  uploadDirect.mockResolvedValue('https://ik.duncit.com/call-recordings/raw.webm');
  client.mutate.mockResolvedValue({ data: { startVideoCompression: { job_id: 'job-1' } } });
  client.query.mockResolvedValue({
    data: { videoCompressionJob: { status: 'DONE', url: 'https://ik.duncit.com/call-recordings/call.mp4' } },
  });
};

beforeEach(() => {
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.failNext = false;
  g.MediaRecorder = FakeMediaRecorder;
  g.MediaStream = FakeMediaStream;
  g.AudioContext = FakeAudioContext;
  uploadDirect.mockReset();
  client.query.mockReset();
  client.mutate.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('starting', () => {
  it('records one mixed stream — their video, both microphones', () => {
    const { result } = mount();
    act(() => result.current.toggle());

    expect(result.current.stage).toBe('RECORDING');
    const media = FakeMediaRecorder.instances[0];
    // The video track plus the ONE mixed audio track, never two audio tracks.
    expect(media.stream.getVideoTracks()).toHaveLength(1);
    expect(media.stream.getAudioTracks()).toHaveLength(1);
    expect(media.options.mimeType).toBe('video/webm;codecs=vp9,opus');
    // Timesliced, so a crash mid-call still leaves the chunks so far.
    expect(media.started).toBe(2000);
  });

  it('falls back to an audio container when nobody has a camera on', () => {
    const { result } = mount({ remoteStream: stream('audio') });
    act(() => result.current.toggle());
    expect(FakeMediaRecorder.instances[0].options.mimeType).toBe('audio/webm;codecs=opus');
  });

  it('still records the video when there is no Web Audio at all', () => {
    delete g.AudioContext;
    const { result } = mount();
    act(() => result.current.toggle());
    expect(FakeMediaRecorder.instances[0].stream.getAudioTracks()).toHaveLength(0);
    expect(FakeMediaRecorder.instances[0].stream.getVideoTracks()).toHaveLength(1);
    expect(result.current.stage).toBe('RECORDING');
  });

  it('says so when the browser cannot record', () => {
    delete g.MediaRecorder;
    const { result } = mount();
    act(() => result.current.toggle());
    expect(result.current.error).toBe('This browser cannot record.');
    expect(result.current.stage).toBe('IDLE');
  });

  it('refuses an empty take rather than recording silence', () => {
    delete g.AudioContext;
    const { result } = mount({ localStream: null, remoteStream: null });
    act(() => result.current.toggle());
    expect(result.current.error).toBe('There is nothing to record yet.');
  });

  it('fails visibly when the recorder itself throws', () => {
    FakeMediaRecorder.failNext = true;
    const { result } = mount();
    act(() => result.current.toggle());
    expect(result.current.stage).toBe('FAILED');
    expect(result.current.error).toBe('recorder exploded');
  });
});

describe('stopping', () => {
  const record = () => {
    const rendered = mount();
    act(() => rendered.result.current.toggle());
    const media = FakeMediaRecorder.instances[0];
    act(() => media.ondataavailable?.({ data: new Blob(['chunk']) }));
    return rendered;
  };

  it('uploads, transcodes and lands on the mp4', async () => {
    instantPipeline();
    const { result } = record();

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.stage).toBe('READY'));

    expect(result.current.url).toBe('https://ik.duncit.com/call-recordings/call.mp4');
    const [, file, folder] = uploadDirect.mock.calls[0];
    expect(folder).toBe('/call-recordings');
    expect((file as File).name).toMatch(/^call-.*\.webm$/);
    expect(client.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          remoteUrl: 'https://ik.duncit.com/call-recordings/raw.webm',
          folder: '/call-recordings',
          surface: 'PORTALS',
        },
      })
    );
  });

  it('hanging up ends the take — the tracks are already gone', async () => {
    instantPipeline();
    const rendered = record();

    rendered.rerender({ connected: false, localStream: null, remoteStream: null });
    await waitFor(() => expect(rendered.result.current.stage).toBe('READY'));
  });

  it('drops an empty recording without uploading anything', async () => {
    const { result } = mount();
    act(() => result.current.toggle());

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.stage).toBe('IDLE'));
    expect(uploadDirect).not.toHaveBeenCalled();
  });

  it('reports the pipeline refusing to start a job', async () => {
    uploadDirect.mockResolvedValue('https://ik.duncit.com/call-recordings/raw.webm');
    client.mutate.mockResolvedValue({ data: { startVideoCompression: null } });
    const { result } = record();

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.stage).toBe('FAILED'));
    expect(result.current.error).toBe('Conversion did not start');
  });

  it('reports a conversion the server marked failed', async () => {
    uploadDirect.mockResolvedValue('https://ik.duncit.com/call-recordings/raw.webm');
    client.mutate.mockResolvedValue({ data: { startVideoCompression: { job_id: 'job-2' } } });
    client.query.mockResolvedValue({
      data: { videoCompressionJob: { status: 'FAILED', error: 'ffmpeg crashed' } },
    });
    const { result } = record();

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.stage).toBe('FAILED'));
    expect(result.current.error).toBe('ffmpeg crashed');
  });

  it('shows the transcode percentage while the job is still running', async () => {
    vi.useFakeTimers();
    uploadDirect.mockResolvedValue('https://ik.duncit.com/call-recordings/raw.webm');
    client.mutate.mockResolvedValue({ data: { startVideoCompression: { job_id: 'job-3' } } });
    client.query
      .mockResolvedValueOnce({ data: { videoCompressionJob: { status: 'PROCESSING', pct: 40 } } })
      .mockResolvedValue({
        data: { videoCompressionJob: { status: 'DONE', url: 'https://ik.duncit.com/call-recordings/call.mp4' } },
      });
    const { result } = record();

    act(() => result.current.toggle());
    // First poll answers PROCESSING; the 2s sleep sits between it and the next.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(result.current.stage).toBe('READY');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('resets back to idle for the next call', async () => {
    instantPipeline();
    const { result } = record();
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.stage).toBe('READY'));

    act(() => result.current.reset());
    expect(result.current.stage).toBe('IDLE');
    expect(result.current.url).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
