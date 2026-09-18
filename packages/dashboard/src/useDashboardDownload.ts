import { useCallback, useRef, useState } from 'react';
import { createLogger } from '@duncit/logs';
import { downloadDashboardImage } from './download';

const logger = createLogger('portal');

export interface DashboardDownload {
  /** Attach to the element the picture is taken of. */
  targetRef: React.RefObject<HTMLDivElement | null>;
  downloading: boolean;
  /** Inline message when the image could not be made. */
  error: string | null;
  /** Fire-and-forget: a failure lands in `error`. */
  download: () => void;
}

/**
 * The dashboard's Download button: saves what the person is looking at as
 * `<dashboardId>.png`. Success is the file itself, so only a failure gets copy.
 */
export function useDashboardDownload(
  dashboardId: string,
  backgroundColor: string,
  failedLabel: string
): DashboardDownload {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;
    setDownloading(true);
    setError(null);
    downloadDashboardImage(target, `${dashboardId}.png`, backgroundColor)
      .finally(() => setDownloading(false))
      .catch((err: unknown) => {
        logger.error('dashboard', 'download', { error: err, dashboardId });
        setError(failedLabel);
      });
  }, [dashboardId, backgroundColor, failedLabel]);

  return { targetRef, downloading, error, download };
}
