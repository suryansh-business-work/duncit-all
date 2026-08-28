import { flattenCatalogue } from './catalogue';
import { CAPTCHA_BUNDLE } from './bundles/captcha';
import type { TranslateOptions } from './translator';

/**
 * The captcha widget's words, resolved once for every surface that draws it.
 *
 * Every key is written out as a literal `t('…')` rather than composed from the
 * field name, because `scripts/verify-translation-keys.mjs` greps source for
 * literal keys — a computed key is reported as shipped-but-never-rendered and
 * fails the Shared Gates job.
 *
 * It lives here rather than in `@duncit/captcha` for the same reason every
 * other surface's copy does (rule 38): the admin seeds Localization from this
 * package, so copy written anywhere else is copy no translator ever sees.
 */

/** The `t` any surface hands in. Structural, so no surface owns this module. */
export type CaptchaTranslate = (key: string, options?: TranslateOptions) => string;

export interface CaptchaCopy {
  title: string;
  label: string;
  hint: string;
  imageAlt: string;
  refresh: string;
  loading: string;
  unavailable: string;
  required: string;
  wrong: string;
  expired: string;
}

export function captchaCopy(t: CaptchaTranslate): CaptchaCopy {
  return {
    title: t('captcha.title'),
    label: t('captcha.label'),
    hint: t('captcha.hint'),
    imageAlt: t('captcha.imageAlt'),
    refresh: t('captcha.refresh'),
    loading: t('captcha.loading'),
    unavailable: t('captcha.unavailable'),
    required: t('captcha.required'),
    wrong: t('captcha.wrong'),
    expired: t('captcha.expired'),
  };
}

const FALLBACK = flattenCatalogue(CAPTCHA_BUNDLE);

/**
 * One shipped word, by its key.
 *
 * Exported so the fallback is somebody's contract rather than an unreachable
 * guard: an index lookup reads as a possibly-undefined string under the native
 * app's stricter compiler, so the fallback has to be there — and being a
 * named function is what lets a test show what it does with a key the bundle
 * does not carry.
 */
export const captchaFallbackWord = (key: string): string => FALLBACK[key] ?? key;

/**
 * The same copy with nothing to resolve it — the default language, read
 * straight off the shipped bundle so there is one copy of the words and not
 * two. The Astro marketing sites have no translator at build time, and a
 * blank label is worse than an untranslated one.
 */
export const CAPTCHA_FALLBACK_COPY: CaptchaCopy = captchaCopy(captchaFallbackWord);
