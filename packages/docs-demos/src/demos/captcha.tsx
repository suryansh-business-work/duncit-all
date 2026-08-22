import { CAPTCHA_FALLBACK_COPY, captchaCopy, captchaErrorCode } from '@duncit/captcha';
import { defineDemo, defineDemos } from '../types';

interface CaptchaMock {
  /** The GraphQL errors a public mutation rejected with. */
  errors: { message: string; extensions?: { code?: string } }[];
  /** Server copy for the current locale. A key missing here falls back to the
   * shipped English, which is why the widget reads correctly offline. */
  translated: Record<string, string>;
}

export default defineDemos('captcha', [
  defineDemo<CaptchaMock>({
    id: 'errors',
    title: 'Telling a wrong answer from an expired one',
    note:
      "Change the code to CAPTCHA_EXPIRED. Both mean 'try again', but only one means the person got it wrong — and the widget reloads for a different reason in each case.",
    mock: {
      errors: [
        {
          message: 'That code did not match. Please try again.',
          extensions: { code: 'CAPTCHA_INVALID' },
        },
      ],
      translated: {},
    },
    compute: (mock) => ({
      'captchaErrorCode(errors)': captchaErrorCode(mock.errors) ?? 'not a captcha failure',
      // A surface passes its own `t`; here it is backed by the mock above so a
      // reader can see a translated key win and a missing one fall back.
      'Copy this surface renders': captchaCopy((key: string) => mock.translated[key] ?? key),
      'Shipped fallback copy': CAPTCHA_FALLBACK_COPY,
      'Who is asked at all':
        'Only signed-out callers. A signed-in account is already identified, so the challenge is skipped.',
    }),
  }),
]);
