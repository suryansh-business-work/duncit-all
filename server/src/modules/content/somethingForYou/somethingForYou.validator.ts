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
  // An in-app path, not a URL: both surfaces route it themselves.
  link_path: yup
    .string()
    .trim()
    .max(200)
    .matches(/^(\/[\w\-/:.]*)?$/, 'Use an in-app path such as /referral')
    .default(''),
  sort_order: yup.number().integer().min(0).default(0),
  is_active: yup.boolean().default(true),
});
