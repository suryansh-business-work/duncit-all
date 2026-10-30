import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { optionKey } from '../amenity-options';

/** One entry a venue adds of its own to a chip list: named, short, and not on the list already. */
export const makeOwnEntrySchema = (t: Translate, maxLength: number, taken: ReadonlySet<string>) =>
  z.object({
    entry: z
      .string()
      .trim()
      .min(1, t('partners.registerVenuePage.ownEntryRequired'))
      .max(maxLength, t('partners.registerVenuePage.ownEntryTooLong', { vars: { max: maxLength } }))
      .refine((text) => !taken.has(optionKey(text)), t('partners.registerVenuePage.ownEntryDuplicate')),
  });

export type OwnEntryValues = z.infer<ReturnType<typeof makeOwnEntrySchema>>;

export interface OwnEntryProps {
  /** The list's name, read out on the "+" chip and the input. */
  groupLabel: string;
  maxLength: number;
  /** `optionKey` of every entry already chosen in this list — typing one again is refused. */
  taken: ReadonlySet<string>;
  /** What the input opens with: the owner's search, so a search that found nothing can be added as typed. */
  initial: string;
  onAdd: (entry: string) => void;
  testId: string;
}

export interface OwnEntryFormProps extends OwnEntryProps {
  onClose: () => void;
}
