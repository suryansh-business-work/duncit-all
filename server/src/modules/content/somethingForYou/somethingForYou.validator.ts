import * as yup from 'yup';

/**
 * Thirty characters, enforced here rather than by the card's CSS.
 *
 * The card is a fixed size on both surfaces, so a longer headline does not
 * wrap — it disappears behind an ellipsis. Refusing it at the point somebody
 * types it is the only place the truncation is still fixable.
 */
export const TITLE_MAX = 30;

export const somethingForYouInputSchema = yup.object({
  title: yup.string().trim().required('Title is required').max(TITLE_MAX),
  image_url: yup.string().trim().max(600).default(''),
  bottom_text: yup.string().trim().max(60).default(''),
  action_type: yup.string().oneOf(['NONE', 'ROUTE', 'URL']).default('NONE'),
  /*
    Each half is required only when it is the one being used.

    Validating both unconditionally would reject a URL card for having no
    path, and letting both through unchecked would let a card ship with a
    button that goes nowhere — which is exactly the state this section was
    meant to make impossible.
  */
  link_path: yup
    .string()
    .trim()
    .max(200)
    .matches(/^(\/[\w\-/:.]*)?$/, 'Use an in-app path such as /referral')
    .when('action_type', {
      is: 'ROUTE',
      then: (schema) => schema.required('Choose where this card goes'),
    })
    .default(''),
  link_url: yup
    .string()
    .trim()
    .max(600)
    .url('Use a full address, including https://')
    .when('action_type', {
      is: 'URL',
      then: (schema) => schema.required('Enter the address this card opens'),
    })
    .default(''),
  sort_order: yup.number().integer().min(0).default(0),
  is_active: yup.boolean().default(true),
});
