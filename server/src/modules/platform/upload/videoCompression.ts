import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpegStaticPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { GraphQLError } from 'graphql';
import type { IUploadSetting } from '@modules/platform/uploadSetting/uploadSetting.model';
import { getUploadSettingsSafe } from './mediaProcessing';
import { uploadToImagekit } from './upload.service';

// Docker (alpine musl) supplies the encoder via `apk add ffmpeg` + FFMPEG_PATH;
// the ffmpeg-static binary covers local dev; a bare `ffmpeg` on PATH is last.
ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || (ffmpegStaticPath as unknown as string) || 'ffmpeg');

export interface VideoCompressionJob {
  job_id: string;
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  pct: number;
  url: string | null;
  error: string | null;
  created_at: number;
}

// In-memory job registry — jobs are short-lived (one compression) and polled by
// the uploading client; a server restart simply fails the poll and the client
// keeps the uncompressed (already uploaded) URL.
const jobs = new Map<string, VideoCompressionJob>();
const JOB_TTL_MS = 60 * 60 * 1000;

function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.created_at < cutoff) jobs.delete(id);
  }
}

const clampPct = (value: number) => Math.min(99, Math.max(0, Math.round(value)));

/** Only videos already on OUR CDN may be pulled back for compression. */
function assertImagekitUrl(remoteUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(remoteUrl);
  } catch {
    throw new GraphQLError('Invalid video URL', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (parsed.protocol !== 'https:' || !/(^|\.)imagekit\.io$/i.test(parsed.hostname)) {
    throw new GraphQLError('Only ImageKit-hosted videos can be compressed', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return parsed;
}

function runFfmpeg(job: VideoCompressionJob, inPath: string, outPath: string, setting: IUploadSetting) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inPath)
      .videoCodec('libx264')
      .outputOptions([
        '-preset',
        'veryfast',
        '-crf',
        String(setting.video_crf),
        '-movflags',
        '+faststart',
        '-pix_fmt',
        'yuv420p',
      ])
      .audioCodec('aac')
      .audioBitrate('128k')
      .videoFilters(`scale=-2:'min(ih,${setting.video_max_height})'`)
      .on('progress', (p: { percent?: number }) => {
        if (typeof p.percent === 'number' && Number.isFinite(p.percent)) {
          job.pct = clampPct(p.percent);
        }
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .save(outPath);
  });
}

async function runJob(job: VideoCompressionJob, remoteUrl: string, folder: string | undefined, setting: IUploadSetting) {
  const stamp = `${Date.now()}-${job.job_id}`;
  const inPath = path.join(os.tmpdir(), `duncit-vc-in-${stamp}.mp4`);
  const outPath = path.join(os.tmpdir(), `duncit-vc-out-${stamp}.mp4`);
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) throw new Error(`Could not download video (${res.status})`);
    await fs.promises.writeFile(inPath, Buffer.from(await res.arrayBuffer()));

    await runFfmpeg(job, inPath, outPath, setting);

    const outBytes = await fs.promises.readFile(outPath);
    const uploaded = await uploadToImagekit({
      fileBytes: outBytes,
      fileName: `compressed-${job.job_id}.mp4`,
      folder,
    });
    job.url = uploaded.url;
    job.pct = 100;
    job.status = 'DONE';
  } finally {
    await fs.promises.unlink(inPath).catch(() => undefined);
    await fs.promises.unlink(outPath).catch(() => undefined);
  }
}

/**
 * Start compressing an (already direct-uploaded) ImageKit video with FFmpeg,
 * re-uploading the result to ImageKit. Returns immediately with a job the
 * client polls via videoCompressionJob for a real percentage loader. When
 * video compression is disabled for the surface, the job completes instantly
 * with the original URL.
 */
export async function startVideoCompression(opts: {
  remoteUrl: string;
  folder?: string;
  surface?: string;
}): Promise<VideoCompressionJob> {
  assertImagekitUrl(opts.remoteUrl);
  pruneJobs();
  const job: VideoCompressionJob = {
    job_id: crypto.randomBytes(8).toString('hex'),
    status: 'PROCESSING',
    pct: 0,
    url: null,
    error: null,
    created_at: Date.now(),
  };
  jobs.set(job.job_id, job);

  const setting = await getUploadSettingsSafe(opts.surface);
  if (!setting?.video_compression_enabled) {
    job.status = 'DONE';
    job.pct = 100;
    job.url = opts.remoteUrl;
    return job;
  }

  runJob(job, opts.remoteUrl, opts.folder, setting).catch((err: unknown) => {
    job.status = 'FAILED';
    job.error = err instanceof Error ? err.message : 'Video compression failed';
  });
  return job;
}

export function getVideoCompressionJob(jobId: string): VideoCompressionJob {
  const job = jobs.get(jobId);
  if (!job) {
    throw new GraphQLError('Compression job not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return job;
}
