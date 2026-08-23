import {
  AD_DURATION_FALLBACK,
  adRequestT,
  buildAdRequestSchema,
  blankAdRequestValues,
  makeAdRequestSchema,
  toSubmitAdRequestInput,
} from '@duncit/ad-request-form';
import { defineDemo, defineDemos } from '../types';

type AdRequestValues = ReturnType<typeof blankAdRequestValues>;

/** The form's own values, plus the admin-configured duration window around them. */
type AdMock = AdRequestValues & { window_min: number; window_max: number };

export default defineDemos('ad-request-form', [
  defineDemo<AdMock>({
    id: 'validate',
    title: 'An advertiser’s request, and the window it has to fit',
    note:
      'Raise duration_days past window_max: the base schema is happy and the windowed one is not — the cap is admin-configured, so it cannot live inside the schema literal.',
    mock: {
      ...blankAdRequestValues(),
      ad_title: 'Monsoon sale — 25% off all rackets',
      ad_description:
        'Two weeks of banner placement on the Bengaluru home feed, aimed at badminton and tennis pods.',
      media_url: 'https://ik.imagekit.io/duncit/ads/monsoon-banner.jpg',
      duration_days: 14,
      window_min: AD_DURATION_FALLBACK.min,
      window_max: AD_DURATION_FALLBACK.max,
    },
    compute: (mock) => {
      // The messages come from the catalogue, so the schema takes a translator
      // — the console's live one inside a portal, the package's own here.
      const windowed = makeAdRequestSchema(
        { min: mock.window_min, max: mock.window_max },
        adRequestT,
      );
      const base = buildAdRequestSchema(adRequestT).safeParse(mock);
      const bounded = windowed.safeParse(mock);
      return {
        'Admin-configured window': `${mock.window_min}–${mock.window_max} days`,
        'Base schema accepts it': base.success,
        'Windowed schema accepts it': bounded.success,
        Errors: bounded.success
          ? []
          : bounded.error.issues.map(
              (issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`
            ),
        'What the server receives': base.success ? toSubmitAdRequestInput(base.data) : 'n/a',
      };
    },
  }),
]);
