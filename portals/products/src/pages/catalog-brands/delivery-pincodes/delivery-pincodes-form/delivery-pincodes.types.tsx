import { z } from 'zod';
import { isPincode } from '@duncit/regex';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Split a pasted list (one per line, or comma / space separated) into pincodes. */
export function parsePincodes(text: string): string[] {
  const tokens = text.replaceAll(',', ' ').replaceAll('\n', ' ').replaceAll('\t', ' ').split(' ');
  return [...new Set(tokens.map((token) => token.trim()).filter(Boolean))];
}

export const makeDeliveryPincodesSchema = (t: Translate) =>
  z.object({
    pincodes: z
      .string()
      .refine((text) => parsePincodes(text).length > 0, t('products.deliveryPincodes.required'))
      .refine((text) => parsePincodes(text).every(isPincode), {
        // Names the first few bad entries so they can be found in a long paste.
        error: (issue) =>
          t('products.deliveryPincodes.invalid', {
            vars: {
              list: parsePincodes(String(issue.input))
                .filter((p) => !isPincode(p))
                .slice(0, 5)
                .join(', '),
            },
          }),
      }),
  });

export type DeliveryPincodesFormValues = z.infer<ReturnType<typeof makeDeliveryPincodesSchema>>;

export const deliveryPincodesInitialValues: DeliveryPincodesFormValues = { pincodes: '' };
