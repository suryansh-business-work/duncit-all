import { z } from 'zod';
import { CHALLENGE_CAPTION_MAX, mediaTypeOfMime, type ChallengeMediaType } from '@duncit/utils';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export interface SubmissionRules {
  /** The media kinds this tool takes. */
  accepted: ChallengeMediaType[];
  /** A host submitting on someone's behalf must say for whom. */
  pickCompetitor: boolean;
  /** The upload-size gate from Admin > Upload Settings: a sentence when the file is too large. */
  tooLarge: (file: File) => string | null;
}

/** A competitor's piece: a file of an accepted kind and size, with an optional caption. */
export const buildSubmissionSchema = (t: Translate, rules: SubmissionRules) =>
  z.object({
    file: z
      .instanceof(File)
      .nullable()
      .superRefine((file, ctx) => {
        if (!file) {
          ctx.addIssue({ code: 'custom', message: t('mweb.challenge.tools.errors.file') });
          return;
        }
        const kind = mediaTypeOfMime(file.type);
        if (!kind || !rules.accepted.includes(kind)) {
          ctx.addIssue({ code: 'custom', message: t('mweb.challenge.tools.errors.fileType') });
          return;
        }
        const tooLarge = rules.tooLarge(file);
        if (tooLarge) ctx.addIssue({ code: 'custom', message: tooLarge });
      }),
    caption: z
      .string()
      .trim()
      .max(CHALLENGE_CAPTION_MAX, t('mweb.challenge.tools.errors.caption', { vars: { max: CHALLENGE_CAPTION_MAX } })),
    competitor_id: rules.pickCompetitor ? z.string().min(1, t('mweb.challenge.errors.pickCompetitor')) : z.string(),
  });

export interface SubmissionValues {
  file: File | null;
  caption: string;
  competitor_id: string;
}
