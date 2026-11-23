import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { uploadFile, RestError } from '../../lib/rest';

/**
 * The upload queue: each file uploads with its own progress bar, two at a
 * time. Type and size (from Settings › Media & Uploads, via the bootstrap) are
 * checked here for a quick answer and again — the real gate — on the server,
 * which sniffs the bytes.
 */

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'failed';
  error?: string;
}

const CONCURRENCY = 2;

export function useUploads(opts: { folder: string; visibility: string; maxMb: number; types: readonly string[]; onUploaded: () => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<UploadItem[]>([]);
  const queue = useRef<Array<{ id: string; file: File }>>([]);
  const active = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const patch = (id: string, values: Partial<UploadItem>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...values } : i)));

  const pump = useCallback(() => {
    while (active.current < CONCURRENCY && queue.current.length > 0) {
      const next = queue.current.shift();
      if (!next) break;
      active.current += 1;
      patch(next.id, { status: 'uploading' });
      const { promise } = uploadFile(next.file, { folder: optsRef.current.folder, visibility: optsRef.current.visibility }, (progress) => patch(next.id, { progress }));
      promise
        .then(() => {
          patch(next.id, { status: 'done', progress: 100 });
          optsRef.current.onUploaded();
        })
        .catch((err: unknown) => patch(next.id, { status: 'failed', error: err instanceof RestError ? err.message : t('intel.media.uploadFailed') }))
        .finally(() => {
          active.current -= 1;
          pump();
        });
    }
  }, [t]);

  const add = useCallback(
    (files: FileList | File[]) => {
      const accepted: UploadItem[] = [];
      for (const file of Array.from(files)) {
        const id = crypto.randomUUID();
        if (!optsRef.current.types.includes(file.type)) accepted.push({ id, name: file.name, progress: 0, status: 'failed', error: t('intel.media.typeRefused') });
        else if (file.size > optsRef.current.maxMb * 1024 * 1024) accepted.push({ id, name: file.name, progress: 0, status: 'failed', error: t('intel.media.tooLarge', { vars: { max: optsRef.current.maxMb } }) });
        else {
          accepted.push({ id, name: file.name, progress: 0, status: 'queued' });
          queue.current.push({ id, file });
        }
      }
      setItems((prev) => [...accepted, ...prev].slice(0, 50));
      pump();
    },
    [pump, t]
  );

  const clearFinished = () => setItems((prev) => prev.filter((i) => i.status === 'queued' || i.status === 'uploading'));
  return { items, add, clearFinished };
}
