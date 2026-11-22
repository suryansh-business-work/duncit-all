// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captcha = vi.hoisted(() => ({
  reloadCaptcha: vi.fn(),
  showCaptchaFailure: vi.fn(() => false),
  captchaFieldsFrom: vi.fn(() => ({ captcha_token: 'tok', captcha_answer: 'ab12' })),
}));
vi.mock('@duncit/captcha', () => captcha);

import { codeNote, collectRefs, failureText, fillCopy, mount, type VenueKitFormCopy } from '../../src/widgets/venue-kit-interest';
import { apiErrorMessage, callVenueKit, VenueKitApiError } from '../../src/widgets/venue-kit-interest-api';
import { flush } from './helpers';

const copy: VenueKitFormCopy = {
  emailCodeSent: 'Code sent to {email}, {minutes} min',
  phoneCodeSent: 'SMS sent to +91 {phone}, {minutes} min',
  testCode: 'Use {code}',
  working: 'Wait',
  doneTitle: 'On the list',
  doneText: 'Thanks {name}, we will write to {email}.',
  doneUpdated: 'Updated.',
  failed: 'Failed',
  nameRequired: 'Name please',
  emailInvalid: 'Bad email',
  phoneInvalid: 'Bad phone',
  codeInvalid: 'Bad code',
};

const MARKUP = `
  <div data-vk-panel="fields">
    <input name="name" value="Cafe Owner"/><input name="email" value="owner@cafe.in"/><input name="phone_number" value="98765 43210"/>
    <div data-vk-captcha></div>
    <button type="button" data-vk-action="send-email">Send email code</button>
    <div data-vk-panel="email-code" hidden><p data-vk-note="email"></p><input name="email_code"/>
      <button type="button" data-vk-action="verify-email">Verify</button><button type="button" data-vk-action="change-email">Change</button></div>
    <div data-vk-panel="email-done" hidden></div>
    <div data-vk-panel="phone" hidden><input name="verify_phone" type="checkbox"/>
      <div data-vk-panel="phone-send" hidden><button type="button" data-vk-action="send-phone">Send SMS</button></div>
      <div data-vk-panel="phone-code" hidden><p data-vk-note="phone"></p><input name="phone_code"/>
        <button type="button" data-vk-action="verify-phone">Verify mobile</button></div>
      <span data-vk-panel="phone-done" hidden></span></div>
    <button type="button" data-vk-action="unknown">Nothing</button><span data-plain>plain</span>
    <p data-form-error class="hidden"></p>
    <button type="submit" disabled>Register</button>
  </div>
  <div data-vk-panel="done" hidden><h3 data-vk-note="done-title"></h3><p data-vk-note="done-text"></p></div>`;

function build(markup = MARKUP): HTMLFormElement {
  document.body.innerHTML = `<form data-graphql-url="https://api.test/gql" data-copy='${JSON.stringify(copy)}'>${markup}</form>`;
  const form = document.querySelector('form') as HTMLFormElement;
  mount(form);
  return form;
}

const answers: unknown[] = [];
let fetchMock: ReturnType<typeof vi.fn>;
/** Queue the bodies the next fetches answer with, in order. */
const answer = (...bodies: unknown[]) => answers.push(...bodies);
const sentBody = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);

const $ = <T extends Element = HTMLElement>(form: HTMLFormElement, selector: string) => form.querySelector(selector) as T;
const input = (form: HTMLFormElement, name: string) => $<HTMLInputElement>(form, `input[name="${name}"]`);
const panel = (form: HTMLFormElement, name: string) => $(form, `[data-vk-panel="${name}"]`);
const errorText = (form: HTMLFormElement) => $(form, '[data-form-error]').textContent;
const click = async (form: HTMLFormElement, action: string) => {
  $<HTMLButtonElement>(form, `[data-vk-action="${action}"]`).click();
  await flush();
};
const submit = async (form: HTMLFormElement) => {
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await flush();
};

const CODE = { expires_in_minutes: 10, resend_after_seconds: 30, sent: true, test_code: null };

/** Walks the form to a verified email. */
async function verifiedEmail(form: HTMLFormElement) {
  answer({ data: { requestVenueKitEmailOtp: CODE } }, { data: { verifyVenueKitEmailOtp: { token: 'email-proof' } } });
  await click(form, 'send-email');
  input(form, 'email_code').value = ' 123 456 ';
  await click(form, 'verify-email');
}

beforeEach(() => {
  answers.length = 0;
  fetchMock = vi.fn(async () => ({ json: async () => answers.shift() }));
  vi.stubGlobal('fetch', fetchMock);
  captcha.showCaptchaFailure.mockReturnValue(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('venue-kit-interest: email first', () => {
  it('mails a code with the captcha, locks the address and says where it went', async () => {
    const form = build();
    answer({ data: { requestVenueKitEmailOtp: CODE } });
    await click(form, 'send-email');
    expect(sentBody(0).query).toContain('requestVenueKitEmailOtp');
    expect(sentBody(0).variables.input).toEqual({ name: 'Cafe Owner', email: 'owner@cafe.in', captcha_token: 'tok', captcha_answer: 'ab12' });
    expect(input(form, 'email').readOnly).toBe(true);
    expect(panel(form, 'email-code').hidden).toBe(false);
    expect($(form, '[data-vk-note="email"]').textContent).toBe('Code sent to owner@cafe.in, 10 min');
    expect(captcha.reloadCaptcha).toHaveBeenCalledWith(form);
    expect($<HTMLButtonElement>(form, '[data-vk-action="send-email"]').textContent).toBe('Send email code');
  });

  it('shows the test code while no mailer is set up', async () => {
    const form = build();
    answer({ data: { requestVenueKitEmailOtp: { ...CODE, sent: false, test_code: '123456' } } });
    await click(form, 'send-email');
    expect($(form, '[data-vk-note="email"]').textContent).toBe('Use 123456');
  });

  it('checks the name and address before calling the server', async () => {
    const form = build();
    input(form, 'name').value = ' A ';
    await click(form, 'send-email');
    expect(errorText(form)).toBe('Name please');
    input(form, 'name').value = 'Cafe';
    input(form, 'email').value = 'nope';
    await click(form, 'send-email');
    expect(errorText(form)).toBe('Bad email');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets the captcha speak for its own failure and reloads it', async () => {
    const form = build();
    captcha.showCaptchaFailure.mockReturnValue(true);
    answer({ errors: [{ message: 'Please complete the verification below.', extensions: { code: 'CAPTCHA_REQUIRED' } }] });
    await click(form, 'send-email');
    expect(errorText(form)).toBe('');
    expect(captcha.reloadCaptcha).toHaveBeenCalled();
    expect(panel(form, 'email-code').hidden).toBe(true);
  });

  it('shows the server field message when the code is refused', async () => {
    const form = build();
    answer({ data: { requestVenueKitEmailOtp: CODE } }, { errors: [{ message: 'Incorrect code — 4 attempts left' }] });
    await click(form, 'send-email');
    input(form, 'email_code').value = '000000';
    await click(form, 'verify-email');
    expect(errorText(form)).toBe('Incorrect code — 4 attempts left');
    expect($<HTMLButtonElement>(form, 'button[type="submit"]').disabled).toBe(true);
  });

  it('refuses a code that is not six digits without asking the server', async () => {
    const form = build();
    answer({ data: { requestVenueKitEmailOtp: CODE } });
    await click(form, 'send-email');
    input(form, 'email_code').value = '12';
    await click(form, 'verify-email');
    expect(errorText(form)).toBe('Bad code');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a verified email hides the captcha, opens the phone step and enables the submit', async () => {
    const form = build();
    await verifiedEmail(form);
    expect(sentBody(1).variables.input).toEqual({ email: 'owner@cafe.in', code: '123456' });
    expect(panel(form, 'email-done').hidden).toBe(false);
    expect(panel(form, 'phone').hidden).toBe(false);
    expect($(form, '[data-vk-captcha]').hidden).toBe(true);
    expect($<HTMLButtonElement>(form, 'button[type="submit"]').disabled).toBe(false);
  });

  it('change email starts over: proofs dropped, fields unlocked, captcha back', async () => {
    const form = build();
    await verifiedEmail(form);
    input(form, 'verify_phone').checked = true;
    input(form, 'phone_number').readOnly = true;
    await click(form, 'change-email');
    expect(input(form, 'email').readOnly).toBe(false);
    expect(input(form, 'phone_number').readOnly).toBe(false);
    expect(input(form, 'verify_phone').checked).toBe(false);
    expect(panel(form, 'phone').hidden).toBe(true);
    expect($(form, '[data-vk-captcha]').hidden).toBe(false);
    expect($<HTMLButtonElement>(form, 'button[type="submit"]').disabled).toBe(true);
    await submit(form);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('venue-kit-interest: the optional phone', () => {
  it('opens the SMS step only when asked, and closes it again before a code is typed', async () => {
    const form = build();
    await verifiedEmail(form);
    const toggle = input(form, 'verify_phone');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(panel(form, 'phone-send').hidden).toBe(false);
    answer({ data: { requestVenueKitPhoneOtp: CODE } });
    await click(form, 'send-phone');
    expect(sentBody(2).variables.input).toEqual({ email_token: 'email-proof', phone_extension: '+91', phone_number: '9876543210' });
    expect(input(form, 'phone_number').readOnly).toBe(true);
    expect($(form, '[data-vk-note="phone"]').textContent).toBe('SMS sent to +91 9876543210, 10 min');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(panel(form, 'phone-send').hidden).toBe(true);
    expect(panel(form, 'phone-code').hidden).toBe(true);
    expect(input(form, 'phone_number').readOnly).toBe(false);
  });

  it('refuses a number that is not an Indian mobile', async () => {
    const form = build();
    await verifiedEmail(form);
    input(form, 'phone_number').value = '5876543210';
    await click(form, 'send-phone');
    expect(errorText(form)).toBe('Bad phone');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a verified mobile rides along with the submit, and unticking afterwards keeps the proof', async () => {
    const form = build();
    await verifiedEmail(form);
    answer({ data: { requestVenueKitPhoneOtp: CODE } }, { data: { verifyVenueKitPhoneOtp: { token: 'phone-proof' } } });
    await click(form, 'send-phone');
    input(form, 'phone_code').value = '654321';
    await click(form, 'verify-phone');
    expect(sentBody(3).variables.input).toEqual({ phone_extension: '+91', phone_number: '9876543210', code: '654321' });
    expect(panel(form, 'phone-done').hidden).toBe(false);
    const toggle = input(form, 'verify_phone');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(input(form, 'phone_number').readOnly).toBe(true);
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(panel(form, 'phone-send').hidden).toBe(true);

    answer({ data: { submitVenueKitInterest: { ok: true, already_registered: true } } });
    await submit(form);
    expect(sentBody(4).variables.input).toEqual({
      name: 'Cafe Owner',
      email_token: 'email-proof',
      phone_extension: '+91',
      phone_number: '9876543210',
      phone_token: 'phone-proof',
    });
    expect($(form, '[data-vk-note="done-text"]').textContent).toBe('Thanks Cafe Owner, we will write to owner@cafe.in. Updated.');
  });
});

describe('venue-kit-interest: submitting', () => {
  it('registers without a phone proof and swaps the form for the thank-you', async () => {
    const form = build();
    await verifiedEmail(form);
    answer({ data: { submitVenueKitInterest: { ok: true, already_registered: false } } });
    await submit(form);
    expect(sentBody(2).variables.input).toEqual({ name: 'Cafe Owner', email_token: 'email-proof', phone_extension: '+91', phone_number: '9876543210' });
    expect(panel(form, 'fields').hidden).toBe(true);
    expect(panel(form, 'done').hidden).toBe(false);
    expect($(form, '[data-vk-note="done-title"]').textContent).toBe('On the list');
    expect($(form, '[data-vk-note="done-text"]').textContent).toBe('Thanks Cafe Owner, we will write to owner@cafe.in.');
  });

  it('checks the name and number again at submit', async () => {
    const form = build();
    await verifiedEmail(form);
    input(form, 'name').value = '';
    await submit(form);
    expect(errorText(form)).toBe('Name please');
    input(form, 'name').value = 'Cafe';
    input(form, 'phone_number').value = '123';
    await submit(form);
    expect(errorText(form)).toBe('Bad phone');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the generic message when the server answers nothing usable', async () => {
    const form = build();
    await verifiedEmail(form);
    answer({ data: { submitVenueKitInterest: null } });
    await submit(form);
    expect(errorText(form)).toBe('Failed');
    expect(panel(form, 'done').hidden).toBe(true);
  });

  it('shows the generic message for a network failure with no words of its own', async () => {
    const form = build();
    await verifiedEmail(form);
    fetchMock.mockRejectedValueOnce(new Error(''));
    await submit(form);
    expect(errorText(form)).toBe('Failed');
  });

  it('a submit before the email is proved does nothing', async () => {
    const form = build();
    await submit(form);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('venue-kit-interest: mounting', () => {
  it('ignores clicks outside the step buttons and actions it does not know', async () => {
    const form = build();
    $(form, '[data-plain]').click();
    await click(form, 'unknown');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorText(form)).toBe('');
  });

  it('mounts once, and only on a form', () => {
    const form = build();
    mount(form);
    const div = document.createElement('div');
    mount(div);
    expect(div.dataset.cmsMounted).toBeUndefined();
  });

  it('posts to an empty URL rather than crashing when the form names none', async () => {
    document.body.innerHTML = `<form data-copy='${JSON.stringify(copy)}'>${MARKUP}</form>`;
    const form = document.querySelector('form') as HTMLFormElement;
    mount(form);
    answer({ data: { requestVenueKitEmailOtp: CODE } });
    await click(form, 'send-email');
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });

  it('leaves incomplete markup alone and says so, whichever part is missing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const parts = ['input[name="phone_code"]', '[data-vk-panel="done"]', '[data-vk-note="phone"]', '[data-vk-captcha]', 'button[type="submit"]', '[data-form-error]'];
    for (const selector of parts) {
      document.body.innerHTML = `<form>${MARKUP}</form>`;
      const form = document.querySelector('form') as HTMLFormElement;
      form.querySelector(selector)?.remove();
      expect(collectRefs(form)).toBeNull();
      mount(form);
    }
    expect(error).toHaveBeenCalledTimes(parts.length);
    error.mockRestore();
  });
});

describe('venue-kit-interest helpers', () => {
  it('fills known placeholders and leaves unknown ones visible', () => {
    expect(fillCopy('Hi {name}, {missing}', { name: 'Asha' })).toBe('Hi Asha, {missing}');
  });

  it('notes the test code ahead of the destination', () => {
    expect(codeNote(copy, copy.emailCodeSent, { ...CODE, test_code: '111111' }, { email: 'a@b.in' })).toBe('Use 111111');
    expect(codeNote(copy, copy.emailCodeSent, CODE, { email: 'a@b.in' })).toBe('Code sent to a@b.in, 10 min');
  });

  it('reads a failure as its own message, else the fallback', () => {
    expect(failureText(new Error('Boom'), 'Failed')).toBe('Boom');
    expect(failureText(new Error(''), 'Failed')).toBe('Failed');
    expect(failureText('not an error', 'Failed')).toBe('Failed');
  });

  it('prefers the first field message, then the error message, then the fallback', () => {
    expect(apiErrorMessage([{ message: 'Validation failed', extensions: { errors: ['Enter your name'] } }], 'F')).toBe('Enter your name');
    expect(apiErrorMessage([{ message: 'Validation failed', extensions: { errors: [] } }], 'F')).toBe('Validation failed');
    expect(apiErrorMessage([{ message: 'Plain', extensions: {} }], 'F')).toBe('Plain');
    expect(apiErrorMessage([{ message: '' }], 'F')).toBe('F');
    expect(apiErrorMessage([], 'F')).toBe('F');
  });

  it('throws an error carrying the GraphQL errors, and one with none when the field is missing', async () => {
    answer({ errors: [{ message: 'Nope' }] }, { data: null });
    const first = callVenueKit('https://api.test/gql', 'submit', {}, 'F');
    await expect(first).rejects.toBeInstanceOf(VenueKitApiError);
    await expect(first).rejects.toMatchObject({ message: 'Nope', errors: [{ message: 'Nope' }] });
    await expect(callVenueKit('https://api.test/gql', 'submit', {}, 'F')).rejects.toMatchObject({ message: 'F', errors: [] });
  });
});
