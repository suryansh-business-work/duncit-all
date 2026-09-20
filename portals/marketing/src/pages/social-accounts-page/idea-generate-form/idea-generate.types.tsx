import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import type { SocialPlatform } from '../queries';

export const IDEA_COUNTS = [3, 5, 10] as const;
const BRIEF_MAX = 500;

export interface IdeaGenerateFormValues {
  brief: string;
  /** Empty = the networks Duncit has accounts on. */
  platforms: SocialPlatform[];
  count: number;
}

export const blankIdeaGenerateValues = (): IdeaGenerateFormValues => ({ brief: '', platforms: [], count: 5 });

export const ideaGenerateSchema = (t: Translate) =>
  z.object({
    brief: z.string().trim().max(BRIEF_MAX, t('marketing.social.briefTooLong', { vars: { max: BRIEF_MAX } })),
    platforms: z.array(z.enum(['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X', 'YOUTUBE'])),
    count: z.number().int().min(1).max(10),
  });

export interface IdeaGenerateFormProps {
  onSubmit: (values: IdeaGenerateFormValues) => Promise<void>;
}
