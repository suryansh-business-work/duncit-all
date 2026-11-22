import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { Translator } from '@duncit/app-settings';
import type { GiftCardDesignInput, GiftCardDesignRow } from '../queries';

/** The server's own limits on a design. */
export const DESIGN_LIMITS = { name: 120, category: 80, sortOrder: 9999 } as const;

/** Numbers stay strings in the form, so an emptied field reads empty, not 0. */
export interface DesignFormValues {
  name: string;
  category: string;
  front_image_url: string;
  back_image_url: string;
  sort_order: string;
}

export interface DesignFormProps {
  /** Null when adding a design. */
  design: GiftCardDesignRow | null;
  /** Categories already used, offered as suggestions. */
  categories: readonly string[];
  busy: boolean;
  /** A read-only seat sees the design but no save button (the server refuses its writes anyway). */
  readOnly?: boolean;
  errorMessage?: string | null;
  onSubmit: (input: GiftCardDesignInput) => Promise<void> | void;
  onCancel: () => void;
}

export const BLANK_DESIGN: DesignFormValues = {
  name: '',
  category: '',
  front_image_url: '',
  back_image_url: '',
  sort_order: '0',
};

const httpsImage = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .pipe(z.url({ protocol: /^https$/, error: message }));

export const makeDesignSchema = (t: Translator['t']) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('loyalty.designs.nameRequired'))
      .max(DESIGN_LIMITS.name, t('loyalty.designs.nameMax', { vars: { max: DESIGN_LIMITS.name } })),
    category: z
      .string()
      .trim()
      .max(DESIGN_LIMITS.category, t('loyalty.designs.categoryMax', { vars: { max: DESIGN_LIMITS.category } })),
    front_image_url: httpsImage(t('loyalty.designs.frontRequired')),
    back_image_url: httpsImage(t('loyalty.designs.backRequired')),
    sort_order: z
      .string()
      .trim()
      .regex(DIGITS, t('loyalty.designs.sortOrderInvalid', { vars: { max: DESIGN_LIMITS.sortOrder } }))
      .refine((v) => Number(v) <= DESIGN_LIMITS.sortOrder, {
        message: t('loyalty.designs.sortOrderInvalid', { vars: { max: DESIGN_LIMITS.sortOrder } }),
      }),
  });

/** Server row → form strings. */
export function toDesignValues(design: GiftCardDesignRow | null): DesignFormValues {
  if (!design) return BLANK_DESIGN;
  return {
    name: design.name,
    category: design.category,
    front_image_url: design.front_image_url,
    back_image_url: design.back_image_url,
    sort_order: String(design.sort_order),
  };
}

/** Schema-valid form → mutation input. */
export function toDesignInput(values: DesignFormValues): GiftCardDesignInput {
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    front_image_url: values.front_image_url.trim(),
    back_image_url: values.back_image_url.trim(),
    sort_order: Number.parseInt(values.sort_order, 10),
  };
}
