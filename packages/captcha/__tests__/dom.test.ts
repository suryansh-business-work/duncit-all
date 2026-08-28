import { afterEach, describe, expect, it, vi } from 'vitest';
import { CAPTCHA_RELOAD_EVENT, captchaFieldsFrom, reloadCaptcha, showCaptchaFailure } from '../src/dom';

/** A plain-HTML form with the widget's root inside it, the way Astro renders. */
const mount = ({ withRoot = true, token = 'cap_7f3a91', answer = ' 4KP9M ' } = {}) => {
  document.body.innerHTML = `
    <form>
      <input name="captcha_token" value="${token}" />
      <input name="captcha_answer" value="${answer}" />
      ${withRoot ? '<div data-captcha-root></div>' : ''}
    </form>
  `;
  const form = document.querySelector('form') as HTMLFormElement;
  const root = document.querySelector('[data-captcha-root]');
  const detail = vi.fn();
  root?.addEventListener(CAPTCHA_RELOAD_EVENT, (event) => detail((event as CustomEvent).detail));
  return { form, detail };
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('captchaFieldsFrom', () => {
  it('reads the two fields the mutation input needs, trimmed', () => {
    const { form } = mount();

    expect(captchaFieldsFrom(form)).toEqual({
      captcha_token: 'cap_7f3a91',
      captcha_answer: '4KP9M',
    });
  });

  it('reads an empty string for a field the form never rendered', () => {
    document.body.innerHTML = '<form></form>';
    const form = document.querySelector('form') as HTMLFormElement;

    expect(captchaFieldsFrom(form)).toEqual({ captcha_token: '', captcha_answer: '' });
  });

  it('reads an empty string when the field holds a file rather than text', () => {
    document.body.innerHTML = '<form><input type="file" name="captcha_answer" /></form>';
    const form = document.querySelector('form') as HTMLFormElement;

    expect(captchaFieldsFrom(form).captcha_answer).toBe('');
  });
});

describe('reloadCaptcha', () => {
  // A used code is a spent code, right or wrong.
  it('asks the widget for a new code, with no reason attached', () => {
    const { form, detail } = mount();

    reloadCaptcha(form);

    expect(detail).toHaveBeenCalledWith({ code: null });
  });

  it('does nothing at all on a form with no widget in it', () => {
    const { form, detail } = mount({ withRoot: false });

    expect(() => reloadCaptcha(form)).not.toThrow();
    expect(detail).not.toHaveBeenCalled();
  });
});

describe('showCaptchaFailure', () => {
  it('tells the widget why, and tells the caller to stay quiet', () => {
    const { form, detail } = mount();

    const handled = showCaptchaFailure(form, [
      { message: 'refused', extensions: { code: 'CAPTCHA_WRONG' } },
    ]);

    expect(handled).toBe(true);
    expect(detail).toHaveBeenCalledWith({ code: 'wrong' });
  });

  // Still redraws — the token is spent either way — but the caller shows its
  // own message, because the widget has nothing to explain.
  it('redraws but reports false when the captcha was not the reason', () => {
    const { form, detail } = mount();

    const handled = showCaptchaFailure(form, [
      { message: 'name is required', extensions: { code: 'BAD_USER_INPUT' } },
    ]);

    expect(handled).toBe(false);
    expect(detail).toHaveBeenCalledWith({ code: null });
  });

  it('reports false with nothing to read', () => {
    const { form } = mount();

    expect(showCaptchaFailure(form, null)).toBe(false);
    expect(showCaptchaFailure(form, [])).toBe(false);
  });

  it('reports the reason even when there is no widget to redraw', () => {
    const { form } = mount({ withRoot: false });

    expect(
      showCaptchaFailure(form, [{ message: 'expired', extensions: { code: 'CAPTCHA_EXPIRED' } }]),
    ).toBe(true);
  });
});
