import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { MB, directUploadToImagekit, useUploadCaps } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ComposerRequest } from '../../../social-accounts-page/publish/ComposerDialog';

/** Where a reel posted from the studio is filed on ImageKit. */
export const REEL_UPLOAD_FOLDER = '/marketing/reels';

export type PostState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'failed'; message: string };

const IDLE: PostState = { phase: 'idle' };

/** Megabytes, to one decimal, the way the too-large message reads them. */
const megabytes = (bytes: number): string => (bytes / MB).toFixed(1);

/** What the composer opens with, besides the uploaded file. */
export interface PostSource {
  /** The reel the post is made from — the post remembers it. */
  projectId: string;
  /** The words the composer starts with: a chosen variant's caption, or the reel's name. */
  caption: string;
}

/**
 * Hands a rendered reel to the social composer.
 *
 * The MP4 goes to ImageKit first — the networks fetch a post's media by URL and
 * the composer carries URLs, not files — through the same direct upload every
 * portal uses, under the PORTALS caps the admin set, with its real byte
 * progress. Then the composer opens on the caption, that URL and the reel's
 * id, and the operator picks the accounts and the time there.
 *
 * `ready` says a rendered reel is waiting: the caps are asked for then, not on
 * every visit to the studio (see useUploadSettings on why that matters).
 */
export function useReelPost(source: PostSource, ready: boolean) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const caps = useUploadCaps('PORTALS', { skip: !ready });
  const [state, setState] = useState<PostState>(IDLE);
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const { projectId, caption } = source;

  /** Uploads the file and opens the composer on it; answers true once it is open. */
  const post = useCallback(
    async (file: File): Promise<boolean> => {
      const max = caps.maxVideoBytes;
      if (file.size > max) {
        const vars = { size: megabytes(file.size), max: Math.round(max / MB) };
        setState({ phase: 'failed', message: t('ai.reels.export.tooLarge', { vars }) });
        return false;
      }
      setState({ phase: 'uploading', progress: 0 });
      try {
        const url = await directUploadToImagekit(
          client,
          file,
          REEL_UPLOAD_FOLDER,
          (pct) => setState({ phase: 'uploading', progress: pct / 100 }),
          'PORTALS'
        );
        setState(IDLE);
        setComposer({ text: caption, media_url: url, reel_project_id: projectId });
        return true;
      } catch (error) {
        logs.portal.marketing.error('reels', 'post', { error });
        setState({ phase: 'failed', message: parseApiError(error, t('ai.reels.export.uploadFailed')) });
        return false;
      }
    },
    [caps.maxVideoBytes, caption, client, projectId, t]
  );

  const dismiss = useCallback(() => setState(IDLE), []);
  const closeComposer = useCallback(() => setComposer(null), []);

  return { state, post, dismiss, composer, closeComposer };
}

export type ReelPost = ReturnType<typeof useReelPost>;
