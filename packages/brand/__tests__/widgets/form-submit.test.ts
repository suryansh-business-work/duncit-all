// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captcha = vi.hoisted(() => ({
  reloadCaptcha: vi.fn(),
  showCaptchaFailure: vi.fn(() => false),
  captchaFieldsFrom: vi.fn(() => ({})),
}));
vi.mock('@duncit/captcha', () => captcha);

import { submitForm } from '../../src/widgets/form-submit';
import { stubFetch, stubFetchReject } from './helpers';

const copy = { busy: 'Sending', done: 'Sent', idle: 'Send', failed: 'Not sent', failedRetry: 'Try again' };
const request = { url: 'https://api.test/gql', query: 'mutation', input: { a: 1 }, field: 'submitX' };

let form: HTMLFormElement;
let btn: HTMLButtonElement;
let errBox: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML =
    '<form><input name="a" value="v"/><button>Original</button></form><p class="hidden" id="err"></p>';
  form = document.querySelector('form') as HTMLFormElement;
  btn = form.querySelector('button') as HTMLButtonElement;
  errBox = document.getElementById('err') as HTMLElement;
  captcha.reloadCaptcha.mockClear();
  captcha.showCaptchaFailure.mockReset().mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('submitForm', () => {
  it('shows busy state, posts the input and ticks on success', async () => {
    const fetchMock = stubFetch({ data: { submitX: { ok: true } } });
    const input = form.querySelector<HTMLInputElement>('input') as HTMLInputElement;
    input.value = 'typed';
    const pending = submitForm(form, errBox, request, copy);
    expect(btn.disabled).toBe(true);
    expect(btn.innerHTML).toContain('Sending');
    await pending;
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ input: { a: 1 } });
    expect(btn.innerHTML).toContain('Sent');
    expect(input.value).toBe('v'); // form.reset() restored the default value
    expect(captcha.reloadCaptcha).toHaveBeenCalledWith(form);
    expect(errBox.textContent).toBe('');
  });

  it('re-enables the button after the pause but keeps the tick', async () => {
    stubFetch({ data: { submitX: { ok: true } } });
    await submitForm(form, errBox, request, copy);
    expect(btn.disabled).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(btn.disabled).toBe(false);
    expect(btn.innerHTML).toContain('Sent');
  });

  it('shows the server error message and restores the button', async () => {
    stubFetch({ errors: [{ message: 'Bad email' }] });
    await submitForm(form, errBox, request, copy);
    expect(errBox.textContent).toBe('Bad email');
    expect(btn.innerHTML).toBe('Original');
    expect(captcha.reloadCaptcha).toHaveBeenCalledWith(form);
    vi.advanceTimersByTime(3000);
    expect(btn.disabled).toBe(false);
    expect(btn.innerHTML).toBe('Original');
  });

  it('stays quiet when the captcha widget reported its own failure', async () => {
    captcha.showCaptchaFailure.mockReturnValue(true);
    stubFetch({ errors: [{ message: 'captcha wrong' }] });
    await submitForm(form, errBox, request, copy);
    expect(errBox.textContent).toBe('');
    expect(btn.innerHTML).toBe('Original');
    expect(captcha.reloadCaptcha).not.toHaveBeenCalled();
  });

  it('throws the failed copy when the answer lacks ok', async () => {
    stubFetch({ data: { submitX: { ok: false } } });
    await submitForm(form, errBox, request, copy);
    expect(errBox.textContent).toBe('Not sent');
  });

  it('treats an empty body as a failure', async () => {
    stubFetch(null);
    await submitForm(form, errBox, request, copy);
    expect(errBox.textContent).toBe('Not sent');
  });

  it('uses the retry copy when the thrown error has no message', async () => {
    stubFetchReject(new Error(''));
    await submitForm(form, errBox, request, copy);
    expect(errBox.textContent).toBe('Try again');
  });

  it('uses the retry copy for a non-Error rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('offline'));
    await submitForm(form, errBox, request, copy);
    expect(errBox.textContent).toBe('Try again');
  });

  it('falls back to the idle label when the button has no markup', async () => {
    btn.innerHTML = '';
    stubFetch({ data: { submitX: { ok: false } } });
    await submitForm(form, errBox, request, copy);
    expect(btn.innerHTML).toBe('Send');
  });

  it('works for a form without a button', async () => {
    btn.remove();
    stubFetch({ errors: [{ message: 'nope' }] });
    await submitForm(form, errBox, request, copy);
    expect(errBox.textContent).toBe('nope');
    expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
  });
});
