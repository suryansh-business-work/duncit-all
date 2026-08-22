export { CAPTCHA_CHALLENGE_SDL, captchaErrorCode, requestCaptchaChallenge } from './client';
export {
  CAPTCHA_RELOAD_EVENT,
  captchaFieldsFrom,
  reloadCaptcha,
  showCaptchaFailure,
} from './dom';
export type {
  CaptchaChallenge,
  CaptchaErrorCode,
  CaptchaFields,
  GraphqlErrorLike,
} from './types';
// The words live with every other surface's copy (rule 38); re-exported so a
// consumer needs one import, not two.
export { CAPTCHA_FALLBACK_COPY, captchaCopy, type CaptchaCopy } from '@duncit/i18n';
