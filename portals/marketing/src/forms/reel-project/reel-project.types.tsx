import { z } from 'zod';
import type { Translate } from '@duncit/shell';

const FOLDER_PATH = /\/folders\/[\w-]{10,}/;
const FOLDER_ID = /^[\w-]{10,}$/;

/**
 * A Drive folder address: `…/folders/<id>` or `…?id=<id>` on a google.com host.
 * Parsed as a URL rather than matched whole, so the host is really the host and
 * not a string that merely contains "google.com".
 */
function isDriveFolderLink(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !(host === 'google.com' || host.endsWith('.google.com'))) return false;
  return FOLDER_PATH.test(url.pathname) || FOLDER_ID.test(url.searchParams.get('id') ?? '');
}

/**
 * A reel's details: its name, and the Drive folder its footage is read from.
 * The link is optional — a reel can be built from chat uploads alone — but a
 * link that is given must be a folder link, which is checked here so the
 * mistake is caught while the dialog is still open rather than by the server.
 */
export const buildReelProjectSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t('ai.reels.form.nameRequired')).max(80, t('ai.reels.form.nameMax')),
    drive_url: z
      .string()
      .trim()
      .max(500, t('ai.reels.form.driveUrlMax'))
      .refine((value) => value === '' || isDriveFolderLink(value), t('ai.reels.form.driveUrlInvalid')),
  });

export interface ReelProjectFormValues {
  name: string;
  drive_url: string;
}

export const reelProjectInitialValues: ReelProjectFormValues = { name: '', drive_url: '' };

export interface ReelProjectFormProps {
  open: boolean;
  /** Present when editing: the dialog opens on these and says Save instead of Create. */
  initialValues?: ReelProjectFormValues;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ReelProjectFormValues) => Promise<void> | void;
}
