import { captchaErrorCode } from './client';
import type { CaptchaErrorCode, CaptchaFields, GraphqlErrorLike } from './types';

/**
 * The three lines a plain-HTML form needs to talk to the widget.
 *
 * The Astro sites post their own mutations from their own inline scripts —
 * there is no framework in there to hold state — so the contract between a
 * form and its captcha is the DOM itself: two named inputs going out, one
 * event coming back.
 */

const ROOT_SELECTOR = '[data-captcha-root]';
/** The widget listens for this on its own root and redraws itself. */
export const CAPTCHA_RELOAD_EVENT = 'duncit:captcha-reload';

const fieldValue = (form: HTMLFormElement, name: string): string => {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
};

/** The two fields to merge into the mutation input. */
export function captchaFieldsFrom(form: HTMLFormElement): CaptchaFields {
  return {
    captcha_token: fieldValue(form, 'captcha_token'),
    captcha_answer: fieldValue(form, 'captcha_answer'),
  };
}

/** Ask the widget for a new code, optionally saying why it is being asked. */
function signal(scope: ParentNode, code: CaptchaErrorCode | null): boolean {
  const root = scope.querySelector(ROOT_SELECTOR);
  if (!root) return false;
  root.dispatchEvent(new CustomEvent(CAPTCHA_RELOAD_EVENT, { detail: { code } }));
  return true;
}

/**
 * A used code is a spent code, right or wrong — call this after EVERY attempt,
 * or the next submit fails on a token the server has already burned.
 */
export function reloadCaptcha(scope: ParentNode): void {
  signal(scope, null);
}

/**
 * Handle a failed submit. Returns true when the captcha was the reason, so the
 * caller knows the widget is already explaining it and can stay quiet.
 */
export function showCaptchaFailure(
  scope: ParentNode,
  errors: readonly GraphqlErrorLike[] | null | undefined
): boolean {
  const code = captchaErrorCode(errors);
  signal(scope, code);
  return code !== null;
}
