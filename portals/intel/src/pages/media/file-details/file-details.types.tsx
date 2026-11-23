import { z } from 'zod';
import { FOLDER_PATH } from '@duncit/regex';

/** A file's editable details: name, folder and who can see it. Mirrors the server's limits. */

type Translate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

export const NAME_MAX = 200;
export const VISIBILITIES = ['PRIVATE', 'TEAM', 'ADMINS'] as const;

export const makeFileDetailsSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t('intel.media.details.nameRequired')).max(NAME_MAX, t('intel.media.details.nameTooLong', { vars: { max: NAME_MAX } })),
    folder: z.string().trim().regex(FOLDER_PATH, t('intel.media.details.folderInvalid')),
    visibility: z.enum(VISIBILITIES),
  });

export type FileDetailsValues = z.input<ReturnType<typeof makeFileDetailsSchema>>;
export type FileDetailsOutput = z.output<ReturnType<typeof makeFileDetailsSchema>>;
