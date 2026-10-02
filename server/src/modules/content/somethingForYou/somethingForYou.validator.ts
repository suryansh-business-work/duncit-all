import { z } from 'zod';
import { bool, filled, finite, gte, int, matches, maxLen, num, obj, shape, str, trim, url } from '@utils/zod-fields';

/**
 * Thirty characters, enforced here rather than by the card's CSS.
 *
 * The card is a fixed size on both surfaces, so a longer headline does not
 * wrap — it disappears behind an ellipsis. Refusing it at the point somebody
 * types it is the only place the truncation is still fixable.
 */
export const TITLE_MAX = 30;

const ACTION_TYPES = ['NONE', 'ROUTE', 'URL'] as const;

const linkPath = (required?: string) =>
  str(
    z
      .string()
      .check(
        maxLen(200),
        matches(/^(\/[\w\-/:.]*)?$/, 'Use an in-app path such as /referral'),
        ...(required ? [filled(required)] : [])
      ),
    { transforms: [trim], default: '', required }
  );

const linkUrl = (required?: string) =>
  str(
    z
      .string()
      .check(maxLen(600), url('Use a full address, including https://'), ...(required ? [filled(required)] : [])),
    { transforms: [trim], default: '', required }
  );

export const somethingForYouInputSchema = obj(
  shape(
    {
      title: str(z.string().check(filled('Title is required'), maxLen(TITLE_MAX)), {
        required: 'Title is required',
        transforms: [trim],
      }),
      image_url: str(z.string().check(maxLen(600)), { transforms: [trim], default: '' }),
      bottom_text: str(z.string().check(maxLen(60)), { transforms: [trim], default: '' }),
      action_type: str(z.enum(ACTION_TYPES), { oneOf: ACTION_TYPES, default: 'NONE' }),
      link_path: linkPath(),
      link_url: linkUrl(),
      sort_order: num(finite().check(int(), gte(0)), { default: 0 }),
      is_active: bool(z.boolean(), { default: true }),
    },
    {
      /*
        Each half is required only when it is the one being used.

        Validating both unconditionally would reject a URL card for having no
        path, and letting both through unchecked would let a card ship with a
        button that goes nowhere — which is exactly the state this section was
        meant to make impossible.
      */
      when: {
        link_path: (card) => (card.action_type === 'ROUTE' ? linkPath('Choose where this card goes') : undefined),
        link_url: (card) => (card.action_type === 'URL' ? linkUrl('Enter the address this card opens') : undefined),
      },
    }
  )
);
