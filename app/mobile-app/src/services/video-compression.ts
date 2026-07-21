import { StartVideoCompressionDocument, VideoCompressionJobDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

const POLL_MS = 1000;
const MAX_POLLS = 600; // 10 minutes — beyond that keep the uncompressed URL.

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Compress an already direct-uploaded ImageKit video server-side (FFmpeg) and
 * return the compressed URL, reporting the REAL ffmpeg percentage via
 * onProgress. The original upload survives every failure mode: on job
 * failure, poll loss or timeout the uncompressed URL is returned so the flow
 * never breaks. Mirrors @duncit/media-picker's compressUploadedVideo (mWeb).
 */
export async function compressUploadedVideo(
  remoteUrl: string,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  try {
    const started = await graphqlRequest(
      StartVideoCompressionDocument,
      { remoteUrl, folder },
      { auth: true },
    );
    let job = started.startVideoCompression;
    for (let i = 0; job.status === 'PROCESSING' && i < MAX_POLLS; i++) {
      onProgress?.(job.pct);
      await wait(POLL_MS);
      const polled = await graphqlRequest(
        VideoCompressionJobDocument,
        { jobId: job.job_id },
        { auth: true },
      );
      job = polled.videoCompressionJob;
    }
    onProgress?.(100);
    if (job.status === 'DONE' && job.url) return job.url;
    return remoteUrl;
  } catch {
    // A lost poll (e.g. server restart) must not lose the uploaded video.
    onProgress?.(100);
    return remoteUrl;
  }
}
