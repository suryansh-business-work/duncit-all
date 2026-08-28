import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressUploadedVideo } from '../src/videoCompression';

const REMOTE = 'https://ik.imagekit.io/duncit/pods/reel-raw.mp4';
const COMPRESSED = 'https://ik.imagekit.io/duncit/pods/reel.mp4';

type Job = {
  job_id: string;
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  pct: number;
  url: string | null;
  error: string | null;
};

const job = (over: Partial<Job> = {}): Job => ({
  job_id: 'job-1',
  status: 'PROCESSING',
  pct: 0,
  url: null,
  error: null,
  ...over,
});

/**
 * An Apollo client that starts one job and then answers each poll from a
 * script, so a test decides exactly how many rounds the FFmpeg pass takes.
 */
const makeClient = (started: Job | null, polls: readonly Job[]) => {
  const query = vi.fn();
  for (const polled of polls) {
    query.mockResolvedValueOnce({ data: { videoCompressionJob: polled } });
  }
  return {
    mutate: vi.fn().mockResolvedValue({ data: { startVideoCompression: started } }),
    query,
  } as never;
};

const compress = (
  client: ReturnType<typeof makeClient>,
  onProgress?: (pct: number) => void,
  trim?: { start: number; duration: number } | null,
) => compressUploadedVideo(client, REMOTE, 'pods', 'POD_MEDIA' as never, onProgress, trim);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('compressUploadedVideo', () => {
  it('polls until the pass is done and hands back the compressed URL', async () => {
    vi.useFakeTimers();
    const client = makeClient(job(), [
      job({ pct: 40 }),
      job({ status: 'DONE', pct: 100, url: COMPRESSED }),
    ]);
    const onProgress = vi.fn();

    const result = compress(client, onProgress);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(COMPRESSED);
    // The REAL ffmpeg percentage, then 100 once the loop is over.
    expect(onProgress.mock.calls.map(([pct]) => pct)).toEqual([0, 40, 100]);
  });

  it('sends the trim window the caller asked for', async () => {
    vi.useFakeTimers();
    const client = makeClient(job(), [job({ status: 'DONE', pct: 100, url: COMPRESSED })]);

    const result = compress(client, undefined, { start: 2, duration: 30 });
    await vi.runAllTimersAsync();
    await result;

    expect(client.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          remoteUrl: REMOTE,
          folder: 'pods',
          trimStart: 2,
          trimDuration: 30,
        }),
      }),
    );
  });

  it('sends no trim window when the caller asked for none', async () => {
    vi.useFakeTimers();
    const client = makeClient(job(), [job({ status: 'DONE', pct: 100, url: COMPRESSED })]);

    const result = compress(client);
    await vi.runAllTimersAsync();
    await result;

    expect(client.mutate.mock.calls[0][0].variables).toMatchObject({
      trimStart: undefined,
      trimDuration: undefined,
    });
  });

  // The original upload survives every failure mode, so the flow continues on
  // the uncompressed URL rather than losing the video.
  it('keeps the uncompressed URL when no job could be started', async () => {
    const client = makeClient(null, []);

    await expect(compress(client)).resolves.toBe(REMOTE);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('keeps the uncompressed URL when the pass itself failed', async () => {
    vi.useFakeTimers();
    const client = makeClient(job(), [job({ status: 'FAILED', pct: 60, error: 'ffmpeg died' })]);
    const onProgress = vi.fn();

    const result = compress(client, onProgress);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(REMOTE);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('keeps the uncompressed URL when the job finished with no file behind it', async () => {
    vi.useFakeTimers();
    const client = makeClient(job(), [job({ status: 'DONE', pct: 100, url: null })]);

    const result = compress(client);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(REMOTE);
  });

  it('keeps the uncompressed URL when a poll is lost mid-pass', async () => {
    vi.useFakeTimers();
    const client = makeClient(job(), []);
    client.query.mockRejectedValue(new Error('server restarted'));
    const onProgress = vi.fn();

    const result = compress(client, onProgress);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(REMOTE);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('runs without a progress reporter at all', async () => {
    vi.useFakeTimers();
    const client = makeClient(job(), [job({ status: 'DONE', pct: 100, url: COMPRESSED })]);

    const result = compress(client);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(COMPRESSED);
  });

  // An untrimmed over-length video must never publish, so a trim that could
  // not be applied throws instead of quietly falling back.
  describe('when a trim window was requested', () => {
    const TRIM = { start: 2, duration: 30 };

    it('throws when no job could be started', async () => {
      const client = makeClient(null, []);

      await expect(compress(client, undefined, TRIM)).rejects.toThrow(
        'Could not trim the video — please try again.',
      );
    });

    it('throws when a poll is lost mid-pass', async () => {
      vi.useFakeTimers();
      const client = makeClient(job(), []);
      client.query.mockRejectedValue(new Error('server restarted'));

      const result = compress(client, undefined, TRIM);
      const assertion = expect(result).rejects.toThrow(
        'Could not trim the video — please try again.',
      );
      await vi.runAllTimersAsync();
      await assertion;
    });

    it('throws with the server reason when the pass failed', async () => {
      vi.useFakeTimers();
      const client = makeClient(job(), [
        job({ status: 'FAILED', pct: 60, error: 'The clip is shorter than the trim window' }),
      ]);

      const result = compress(client, undefined, TRIM);
      const assertion = expect(result).rejects.toThrow(
        'The clip is shorter than the trim window',
      );
      await vi.runAllTimersAsync();
      await assertion;
    });

    it('throws its own reason when the pass failed without giving one', async () => {
      vi.useFakeTimers();
      const client = makeClient(job(), [job({ status: 'FAILED', pct: 60, error: null })]);

      const result = compress(client, undefined, TRIM);
      const assertion = expect(result).rejects.toThrow(
        'Could not trim the video — please try again.',
      );
      await vi.runAllTimersAsync();
      await assertion;
    });

    it('hands back the trimmed URL when the pass worked', async () => {
      vi.useFakeTimers();
      const client = makeClient(job(), [job({ status: 'DONE', pct: 100, url: COMPRESSED })]);

      const result = compress(client, undefined, TRIM);
      await vi.runAllTimersAsync();

      await expect(result).resolves.toBe(COMPRESSED);
    });
  });
});
