import { z } from 'zod';
import type { OccasionTheme } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';

/** The server keeps a look's name to this many characters. */
export const NAME_MAX = 60;

export interface DuplicateLookFormValues {
  name: string;
}

export const duplicateLookSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('marketing.occasions.form.nameRequired'))
      .max(NAME_MAX, t('marketing.occasions.form.nameTooLong', { vars: { max: NAME_MAX } })),
  });

export interface DuplicateLookFormProps {
  /** The look being copied; null keeps the dialog closed. */
  look: Pick<OccasionTheme, 'key' | 'name'> | null;
  onClose: () => void;
  /** Resolves true once the copy exists. */
  onSubmit: (name: string) => Promise<boolean>;
}
