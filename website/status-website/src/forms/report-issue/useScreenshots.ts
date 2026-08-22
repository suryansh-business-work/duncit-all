import { useCallback, useState } from 'react';
import type { StatusReportImageInput } from '../../types';
import { MAX_SCREENSHOTS, MAX_SCREENSHOT_BYTES } from './report-issue.types';

/**
 * The screenshots a reporter attaches, held outside the form.
 *
 * They are read into base64 here, in the browser, and travel inside the
 * mutation — the form has no session behind it, and handing an anonymous
 * visitor an upload credential is a far bigger door than this needs open.
 */
export interface ScreenshotDraft extends StatusReportImageInput {
  /** Stable list key. An array index would reorder previews on a removal. */
  id: string;
}

type Translate = (key: string) => string;

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('unreadable'));
    reader.readAsDataURL(file);
  });

export interface ScreenshotsState {
  shots: ScreenshotDraft[];
  error: string;
  add: (files: FileList | null) => Promise<void>;
  remove: (id: string) => void;
  clear: () => void;
}

export function useScreenshots(t: Translate): ScreenshotsState {
  const [shots, setShots] = useState<ScreenshotDraft[]>([]);
  const [error, setError] = useState('');

  const add = useCallback(
    async (files: FileList | null) => {
      const picked = [...(files ?? [])];
      if (picked.length === 0) return;
      setError('');

      const accepted: ScreenshotDraft[] = [];
      for (const file of picked) {
        if (shots.length + accepted.length >= MAX_SCREENSHOTS) {
          setError(t('status.report.screenshotLimit'));
          break;
        }
        if (file.size > MAX_SCREENSHOT_BYTES) {
          setError(t('status.report.screenshotTooLarge'));
          continue;
        }
        try {
          accepted.push({
            id: globalThis.crypto.randomUUID(),
            file_name: file.name,
            data: await readAsDataUrl(file),
            mime_type: file.type || 'image/png',
          });
        } catch {
          setError(t('status.report.screenshotUnreadable'));
        }
      }
      if (accepted.length > 0) setShots((current) => [...current, ...accepted]);
    },
    [shots.length, t]
  );

  const remove = useCallback((id: string) => {
    setShots((current) => current.filter((shot) => shot.id !== id));
    setError('');
  }, []);

  const clear = useCallback(() => {
    setShots([]);
    setError('');
  }, []);

  return { shots, error, add, remove, clear };
}
