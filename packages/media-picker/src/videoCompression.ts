import type { ApolloClient } from '@apollo/client';
import { START_VIDEO_COMPRESSION, VIDEO_COMPRESSION_JOB } from './queries';
import type { UploadSurface } from './types';

interface CompressionJob {
  job_id: string;
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  pct: number;
  url: string | null;
  error: string | null;
}

const POLL_MS = 1000;
const MAX_POLLS = 600; // 10 minutes — beyond that keep the uncompressed URL.

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Trim window (seconds) applied server-side during the FFmpeg pass. */
export interface VideoTrim {
  start: number;
  duration: number;
}

const TRIM_FAILED_MSG = 'Could not trim the video — please try again.';

/**
 * Compress an already direct-uploaded ImageKit video server-side (FFmpeg) and
 * return the compressed URL, reporting the REAL ffmpeg percentage via
 * onProgress. The original upload survives every failure mode, so on job
 * failure/timeout the uncompressed URL is returned and the flow continues —
 * EXCEPT when a trim window was requested: an untrimmed over-length video must
 * never publish, so trim failures throw instead of falling back.
 */
export async function compressUploadedVideo(
  client: ApolloClient<object>,
  remoteUrl: string,
  folder: string,
  surface: UploadSurface,
  onProgress?: (pct: number) => void,
  trim?: VideoTrim | null,
): Promise<string> {
  const started = await client.mutate<{ startVideoCompression: CompressionJob }>({
    mutation: START_VIDEO_COMPRESSION,
    variables: {
      remoteUrl,
      folder,
      surface,
      trimStart: trim?.start,
      trimDuration: trim?.duration,
    },
  });
  const startedJob = started.data?.startVideoCompression;
  if (!startedJob) {
    if (trim) throw new Error(TRIM_FAILED_MSG);
    return remoteUrl;
  }
  let job: CompressionJob = startedJob;

  try {
    for (let i = 0; job.status === 'PROCESSING' && i < MAX_POLLS; i++) {
      onProgress?.(job.pct);
      await wait(POLL_MS);
      const polled = await client.query<{ videoCompressionJob: CompressionJob }>({
        query: VIDEO_COMPRESSION_JOB,
        variables: { jobId: job.job_id },
        fetchPolicy: 'network-only',
      });
      job = polled.data.videoCompressionJob;
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
