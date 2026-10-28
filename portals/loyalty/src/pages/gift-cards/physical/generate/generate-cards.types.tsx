import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { Translator } from '@duncit/app-settings';
import type { CoinUserOption } from '../../../duncit-coin/queries';
import type { PhysicalPolicy } from '../queries';

/** BULK: unmapped cards to print and hand out. MEMBERS: one card per chosen member. */
export type GenerateMode = 'BULK' | 'MEMBERS';

/** The longest batch name the server stores. */
export const LABEL_MAX = 120;

export interface GenerateCardsValues {
  label: string;
  coins: string;
  mode: GenerateMode;
  quantity: string;
  members: CoinUserOption[];
  expires_on: Date | null;
}

export const GENERATE_DEFAULTS: GenerateCardsValues = {
  label: '',
  coins: '',
  mode: 'BULK',
  quantity: '',
  members: [],
  expires_on: null,
};

export interface GenerateCardsFormProps {
  policy: PhysicalPolicy;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: GenerateCardsValues) => Promise<void> | void;
}

const wholeNumberIn = (raw: string, min: number, max: number) => {
  const value = raw.trim();
  return DIGITS.test(value) && Number(value) >= min && Number(value) <= max;
};

/**
 * One batch of printed cards. The server checks every rule again — this is the
 * same policy read from it (`physicalGiftCardPolicy`), so the two never disagree.
 */
export const makeGenerateCardsSchema = (t: Translator['t'], policy: PhysicalPolicy) =>
  z
    .object({
      label: z
        .string()
        .trim()
        .min(1, t('loyalty.physical.labelRequired'))
        .max(LABEL_MAX, t('loyalty.physical.labelMax', { vars: { max: LABEL_MAX } })),
      coins: z
        .string()
        .trim()
        .min(1, t('loyalty.physical.coinsRequired'))
        .refine((v) => wholeNumberIn(v, 1, policy.max_coins_per_card), {
          message: t('loyalty.physical.coinsRange', { vars: { max: policy.max_coins_per_card } }),
        }),
      mode: z.enum(['BULK', 'MEMBERS']),
      quantity: z.string(),
      members: z.array(z.object({ id: z.string(), full_name: z.string(), email: z.string(), balance: z.number() })),
      expires_on: z.date().nullable(),
    })
    .superRefine((v, ctx) => {
      const max = policy.max_cards_per_batch;
      if (v.mode === 'BULK' && !wholeNumberIn(v.quantity, 1, max)) {
        ctx.addIssue({ code: 'custom', path: ['quantity'], message: t('loyalty.physical.quantityRange', { vars: { max } }) });
      }
      if (v.mode === 'MEMBERS' && v.members.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['members'], message: t('loyalty.physical.membersRequired') });
      }
      if (v.mode === 'MEMBERS' && v.members.length > max) {
        ctx.addIssue({ code: 'custom', path: ['members'], message: t('loyalty.physical.membersMax', { vars: { max } }) });
      }
      // The card lives to the END of the chosen day, so today is still a valid choice.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (v.expires_on && v.expires_on.getTime() < startOfToday.getTime()) {
        ctx.addIssue({ code: 'custom', path: ['expires_on'], message: t('loyalty.physical.expiryPast') });
      }
    });

/** How many cards the form would make right now — the summary line and the input both use it. */
export const cardCount = (v: Pick<GenerateCardsValues, 'mode' | 'quantity' | 'members'>): number =>
  v.mode === 'MEMBERS' ? v.members.length : Number(v.quantity) || 0;
