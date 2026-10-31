import { useCallback, useRef, useState } from 'react';
import { useImagekitDirectUpload, useUploadCaps } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ReelUploadInput } from '../../types';
import { measureFile } from './measureFile';

/** Where the studio's own uploads land on ImageKit. */
export const REEL_UPLOADS_FOLDER = '/marketing/reels/uploads';

export type UploadPhase = 'queued' | 'uploading' | 'adding' | 'done' | 'failed';

export interface UploadRow {
  /** Unique within this list; a file picked twice is two rows. */
  id: string;
  name: string;
  phase: UploadPhase;
  /** 0–100 while uploading. */
  progress: number;
  /** Why it failed, in the operator's words. */
  message: string;
}

/**
 * Device uploads, one file after another: checked against the admin's caps,
 * measured, streamed to ImageKit with real byte progress, then added to the
 * reel. Each file is its own row with its own outcome — one bad file does not
 * stop the others, and a failure says which file and why.
 */
export function useReelUploads(addUploads: (uploads: ReelUploadInput[]) => Promise<boolean>) {
  const { t } = useTranslation();
  const caps = useUploadCaps('PORTALS');
  const { upload } = useImagekitDirectUpload();
  const [rows, setRows] = useState<UploadRow[]>([]);
  const nextRow = useRef(0);

  const patch = useCallback((id: string, change: Partial<UploadRow>) => {
    setRows((held) => held.map((row) => (row.id === id ? { ...row, ...change } : row)));
  }, []);

  const uploadOne = useCallback(
    async (row: UploadRow, file: File) => {
      const problem = caps.validate(file, { allowImage: true, allowVideo: true, allowDocuments: false });
      if (problem) {
        patch(row.id, { phase: 'failed', message: problem });
        return;
      }
      try {
        patch(row.id, { phase: 'uploading', progress: 0 });
        const [measure, url] = await Promise.all([measureFile(file), upload(file, REEL_UPLOADS_FOLDER, (pct) => patch(row.id, { progress: pct }), 'PORTALS')]);
        patch(row.id, { phase: 'adding', progress: 100 });
        const added = await addUploads([{ url, name: file.name, width: measure.width, height: measure.height, size_bytes: file.size }]);
        patch(row.id, added ? { phase: 'done' } : { phase: 'failed', message: t('ai.reels.upload.addFailed') });
      } catch (error) {
        patch(row.id, { phase: 'failed', message: parseApiError(error, t('ai.reels.upload.failed')) });
      }
    },
    [addUploads, caps, patch, t, upload]
  );

  /** Queues the picked files and uploads them in order. */
  const add = useCallback(
    async (files: readonly File[]) => {
      const queued = files.map((file) => ({ file, row: { id: `u${(nextRow.current += 1)}`, name: file.name, phase: 'queued' as const, progress: 0, message: '' } }));
      setRows((held) => [...held, ...queued.map((item) => item.row)]);
      for (const item of queued) await uploadOne(item.row, item.file);
    },
    [uploadOne]
  );

  const clearFinished = useCallback(() => {
    setRows((held) => held.filter((row) => row.phase !== 'done' && row.phase !== 'failed'));
  }, []);

  return {
    rows,
    add,
    clearFinished,
    busy: rows.some((row) => row.phase === 'uploading' || row.phase === 'adding'),
    maxImageBytes: caps.maxImageBytes,
    maxVideoBytes: caps.maxVideoBytes,
  };
}

export type ReelUploads = ReturnType<typeof useReelUploads>;
