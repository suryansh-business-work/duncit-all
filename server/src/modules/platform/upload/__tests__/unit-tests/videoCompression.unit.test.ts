jest.mock('ffmpeg-static', () => '/mock/ffmpeg');
jest.mock('fluent-ffmpeg', () => {
  const chain = jest.fn();
  (chain as any).setFfmpegPath = jest.fn();
  return chain;
});

import { getVideoCompressionJob, startVideoCompression } from '../../videoCompression';

describe('videoCompression unit', () => {
  it('rejects malformed and non-ImageKit URLs', async () => {
    await expect(startVideoCompression({ remoteUrl: 'not a url' })).rejects.toThrow(
      'Invalid video URL',
    );
    await expect(
      startVideoCompression({ remoteUrl: 'https://evil.example.com/v.mp4' }),
    ).rejects.toThrow('Only ImageKit-hosted videos can be compressed');
    await expect(
      startVideoCompression({ remoteUrl: 'http://ik.imagekit.io/x/v.mp4' }),
    ).rejects.toThrow('Only ImageKit-hosted videos can be compressed');
  });

  it('completes instantly with the original URL when settings are unavailable (compression off)', async () => {
    // Unit context has no DB connection → getUploadSettingsSafe returns null →
    // the job passes the already-uploaded URL through untouched.
    const job = await startVideoCompression({
      remoteUrl: 'https://ik.imagekit.io/x/reel.mp4',
      folder: '/pods/reels',
    });
    expect(job.status).toBe('DONE');
    expect(job.pct).toBe(100);
    expect(job.url).toBe('https://ik.imagekit.io/x/reel.mp4');
    // And the job is pollable by id.
    expect(getVideoCompressionJob(job.job_id).job_id).toBe(job.job_id);
  });

  it('throws NOT_FOUND for an unknown job id', () => {
    expect(() => getVideoCompressionJob('nope')).toThrow('Compression job not found');
  });
});
