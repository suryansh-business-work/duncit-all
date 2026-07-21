import { StartVideoCompressionDocument, VideoCompressionJobDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

const POLL_MS = 1000;
const MAX_POLLS = 600; // 10 minutes — beyond that keep the uncompressed URL.

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Trim window (seconds) applied server-side during the FFmpeg pass. */
export interface VideoTrim {
  start: number;
  duration: number;
}

const TRIM_FAILED_MSG = 'Could not trim the video — please try again.';

interface CompressionJob {
  job_id: string;
  status: string;
  pct: number;
  url?: string | null;
  error?: string | null;
}

/**
 * Compress an already direct-uploaded ImageKit video server-side (FFmpeg) and
 * return the compressed URL, reporting the REAL ffmpeg percentage via
 * onProgress. The original upload survives every failure mode: on job
 * failure, poll loss or timeout the uncompressed URL is returned so the flow
 * never breaks — EXCEPT when a trim window was requested: an untrimmed
 * over-length story must never publish, so trim failures throw instead.
 * Mirrors @duncit/media-picker's compressUploadedVideo (mWeb).
 */
export async function compressUploadedVideo(
  remoteUrl: string,
  folder: string,
  onProgress?: (pct: number) => void,
  trim?: VideoTrim | null,
): Promise<string> {
  let job: CompressionJob;
  try {
    const started = await graphqlRequest(
      StartVideoCompressionDocument,
      { remoteUrl, folder, trimStart: trim?.start, trimDuration: trim?.duration },
      { auth: true },
    );
    job = started.startVideoCompression;
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
  } catch {
    // A lost poll (e.g. server restart) must not lose the uploaded video.
    if (trim) throw new Error(TRIM_FAILED_MSG);
    onProgress?.(100);
    return remoteUrl;
  }
  onProgress?.(100);
  if (job.status === 'DONE' && job.url) return job.url;
  if (trim) throw new Error(job.error ?? TRIM_FAILED_MSG);
  return remoteUrl;
}
