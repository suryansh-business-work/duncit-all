import { graphqlRequest } from '@/services/graphql.client';
import { compressUploadedVideo } from '@/services/video-compression';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const URL_RAW = 'https://ik.io/raw.mp4';

const startJob = (over: Record<string, unknown> = {}) => ({
  startVideoCompression: {
    job_id: 'j1',
    status: 'PROCESSING',
    pct: 0,
    url: null,
    error: null,
    ...over,
  },
});
const polledJob = (over: Record<string, unknown> = {}) => ({
  videoCompressionJob: {
    job_id: 'j1',
    status: 'PROCESSING',
    pct: 0,
    url: null,
    error: null,
    ...over,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('compressUploadedVideo', () => {
  it('polls the job with real percentages until DONE and returns the compressed URL', async () => {
    const onProgress = jest.fn();
    mockRequest
      .mockResolvedValueOnce(startJob({ pct: 5 }))
      .mockResolvedValueOnce(polledJob({ pct: 60 }))
      .mockResolvedValueOnce(
        polledJob({ status: 'DONE', pct: 100, url: 'https://ik.io/small.mp4' }),
      );

    const pending = compressUploadedVideo(URL_RAW, '/pods/reels', onProgress);
    await jest.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toBe('https://ik.io/small.mp4');
    expect(onProgress).toHaveBeenCalledWith(5);
    expect(onProgress).toHaveBeenCalledWith(60);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('returns instantly when the server completes the job immediately (compression off)', async () => {
    mockRequest.mockResolvedValueOnce(startJob({ status: 'DONE', pct: 100, url: URL_RAW }));
    await expect(compressUploadedVideo(URL_RAW, '/posts')).resolves.toBe(URL_RAW);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps the uncompressed URL when the job fails or reports DONE without a url', async () => {
    mockRequest
      .mockResolvedValueOnce(startJob())
      .mockResolvedValueOnce(polledJob({ status: 'FAILED', error: 'boom' }));
    const failing = compressUploadedVideo(URL_RAW, '/posts');
    await jest.advanceTimersByTimeAsync(1000);
    await expect(failing).resolves.toBe(URL_RAW);

    mockRequest.mockReset();
    mockRequest.mockResolvedValueOnce(startJob({ status: 'DONE', pct: 100, url: null }));
    await expect(compressUploadedVideo(URL_RAW, '/posts')).resolves.toBe(URL_RAW);
  });

  it('keeps the uncompressed URL when a poll is lost (e.g. server restart)', async () => {
    const onProgress = jest.fn();
    mockRequest.mockResolvedValueOnce(startJob()).mockRejectedValueOnce(new Error('network down'));
    const pending = compressUploadedVideo(URL_RAW, '/posts', onProgress);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBe(URL_RAW);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('forwards the trim window to the server and returns the trimmed URL', async () => {
    mockRequest.mockResolvedValueOnce(
      startJob({ status: 'DONE', pct: 100, url: 'https://ik.io/trimmed.mp4' }),
    );
    await expect(
      compressUploadedVideo(URL_RAW, '/posts', undefined, { start: 3, duration: 15 }),
    ).resolves.toBe('https://ik.io/trimmed.mp4');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { remoteUrl: URL_RAW, folder: '/posts', trimStart: 3, trimDuration: 15 },
      { auth: true },
    );
  });

  it('throws instead of falling back when a required trim fails', async () => {
    // Job reports FAILED — an untrimmed over-length story must never publish.
    mockRequest
      .mockResolvedValueOnce(startJob())
      .mockResolvedValueOnce(polledJob({ status: 'FAILED', error: 'ffmpeg exploded' }));
    const failing = compressUploadedVideo(URL_RAW, '/posts', undefined, { start: 0, duration: 15 });
    failing.catch(() => undefined); // avoid an unhandled rejection while timers advance
    await jest.advanceTimersByTimeAsync(1000);
    await expect(failing).rejects.toThrow('ffmpeg exploded');

    // DONE without a URL carries no job error — the generic trim message fires.
    mockRequest.mockReset();
    mockRequest.mockResolvedValueOnce(startJob({ status: 'DONE', pct: 100, url: null }));
    await expect(
      compressUploadedVideo(URL_RAW, '/posts', undefined, { start: 0, duration: 15 }),
    ).rejects.toThrow(/could not trim/i);
  });

  it('throws when a required trim loses its poll (no untrimmed fallback)', async () => {
    mockRequest.mockResolvedValueOnce(startJob()).mockRejectedValueOnce(new Error('network down'));
    const failing = compressUploadedVideo(URL_RAW, '/posts', undefined, { start: 0, duration: 15 });
    failing.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(failing).rejects.toThrow(/could not trim/i);
  });
});
