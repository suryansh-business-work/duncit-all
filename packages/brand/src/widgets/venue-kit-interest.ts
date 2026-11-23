/**
 * CMS widget `venue-kit-interest`: the Venue Kit "register your interest" form.
 *
 * Email first and required: a 6-digit code, captcha-gated for anonymous
 * visitors. Then the +91 mobile — always asked for, its SMS code optional.
 * The submit spends the email proof (and the phone proof, when there is one).
 *
 * Root: the `<form>` itself, with
 *   - `data-graphql-url` — where to POST;
 *   - `data-copy` — JSON of the `venueKit.form.*` sentences in `VenueKitFormCopy`,
 *     placeholders unresolved;
 *   - inputs `name`, `email`, `phone_number`, `email_code`, `phone_code` and the
 *     checkbox `verify_phone`, the captcha inside `[data-vk-captcha]`;
 *   - buttons `[data-vk-action="send-email|verify-email|change-email|send-phone|verify-phone"]`
 *     and one submit button;
 *   - panels `[data-vk-panel="fields|email-code|email-done|phone|phone-send|phone-code|phone-done|done"]`,
 *     notes `[data-vk-note="email|phone|done-title|done-text"]` and an error line `[data-form-error]`.
 * Markup missing any of these is left alone (logged), never half-mounted.
 */
import { captchaFieldsFrom, reloadCaptcha, showCaptchaFailure } from '@duncit/captcha';
import { EMAIL, OTP_6, PHONE_NUMBER_IN, toDigits } from '@duncit/regex';
import { claimRoot, detach, readJson, showError } from './dom';
import { VenueKitApiError, callVenueKit, type CodeRequest, type SubmitResult, type VENUE_KIT_OPS } from './venue-kit-interest-api';

export interface VenueKitFormCopy {
  emailCodeSent: string;
  phoneCodeSent: string;
  testCode: string;
  working: string;
  doneTitle: string;
  doneText: string;
  doneUpdated: string;
  failed: string;
  nameRequired: string;
  emailInvalid: string;
  phoneInvalid: string;
  codeInvalid: string;
}

/** The +91 the SMS code reaches; the form only takes Indian mobiles. */
const DIAL_CODE = '+91';

const INPUTS = ['name', 'email', 'phone_number', 'email_code', 'phone_code', 'verify_phone'] as const;
const PANELS = ['fields', 'email-code', 'email-done', 'phone', 'phone-send', 'phone-code', 'phone-done', 'done'] as const;
const NOTES = ['email', 'phone', 'done-title', 'done-text'] as const;
type Panel = (typeof PANELS)[number];

/** `{name}` placeholders, filled the way @duncit/i18n fills them; an unknown one stays visible. */
export const fillCopy = (template: string, vars: Readonly<Record<string, string | number>>): string =>
  template.replaceAll(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));

/** What a code request says: where it went, or the test code while nothing could carry it. */
export function codeNote(copy: VenueKitFormCopy, template: string, result: CodeRequest, vars: Readonly<Record<string, string>>): string {
  if (result.test_code) return fillCopy(copy.testCode, { code: result.test_code });
  return fillCopy(template, { ...vars, minutes: result.expires_in_minutes });
}

/** The words a failed step shows: the server's own message, else the generic one. */
export const failureText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

interface Refs {
  inputs: Record<(typeof INPUTS)[number], HTMLInputElement>;
  panels: Record<Panel, HTMLElement>;
  notes: Record<(typeof NOTES)[number], HTMLElement>;
  captcha: HTMLElement;
  submit: HTMLButtonElement;
  error: HTMLElement;
}

/** Every element the form needs, or null when the markup is incomplete. */
export function collectRefs(form: HTMLFormElement): Refs | null {
  const pick = <K extends string, E extends Element>(keys: readonly K[], find: (key: K) => E | null): Record<K, E> | null => {
    const found = keys.map((key) => [key, find(key)] as const);
    return found.every(([, el]) => el) ? (Object.fromEntries(found) as Record<K, E>) : null;
  };
  const inputs = pick(INPUTS, (name) => form.querySelector<HTMLInputElement>(`input[name="${name}"]`));
  const panels = pick(PANELS, (name) => form.querySelector<HTMLElement>(`[data-vk-panel="${name}"]`));
  const notes = pick(NOTES, (name) => form.querySelector<HTMLElement>(`[data-vk-note="${name}"]`));
  const captcha = form.querySelector<HTMLElement>('[data-vk-captcha]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const error = form.querySelector<HTMLElement>('[data-form-error]');
  if (!inputs || !panels || !notes || !captcha || !submit || !error) return null;
  return { inputs, panels, notes, captcha, submit, error };
}

export function mount(root: HTMLElement): void {
  if (!(root instanceof HTMLFormElement) || !claimRoot(root)) return;
  const form = root;
  const refs = collectRefs(form);
  if (!refs) {
    console.error('cms widget markup incomplete', { widget: 'venue-kit-interest' });
    return;
  }
  const url = form.dataset.graphqlUrl ?? '';
  const copy = readJson<VenueKitFormCopy>(form.dataset.copy);
  const proofs: { email: string | null; phone: string | null } = { email: null, phone: null };
  const { inputs, panels, notes, captcha, submit: submitButton, error: errBox } = refs;

  const value = (name: (typeof INPUTS)[number]) => inputs[name].value.trim();
  const phone = () => toDigits(value('phone_number'));
  const show = (name: Panel, visible: boolean) => panels[name].toggleAttribute('hidden', !visible);
  const call = <T>(op: keyof typeof VENUE_KIT_OPS, input: Record<string, unknown>) => callVenueKit<T>(url, op, input, copy.failed);

  /** Runs one step with its button busy; a failure lands on the error line (or the captcha's own). */
  async function step(button: HTMLButtonElement, work: () => Promise<void>): Promise<void> {
    showError(errBox, null);
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = copy.working;
    try {
      await work();
    } catch (error) {
      const captchaHandled = error instanceof VenueKitApiError && showCaptchaFailure(form, error.errors);
      if (!captchaHandled) showError(errBox, failureText(error, copy.failed));
    } finally {
      button.innerHTML = label;
      button.disabled = false;
      submitButton.disabled = proofs.email === null;
    }
  }

  function assertName(): void {
    if (value('name').length < 2) throw new Error(copy.nameRequired);
  }

  function assertPhone(): void {
    if (!PHONE_NUMBER_IN.test(phone())) throw new Error(copy.phoneInvalid);
  }

  function codeOf(name: 'email_code' | 'phone_code'): string {
    const code = toDigits(value(name));
    if (!OTP_6.test(code)) throw new Error(copy.codeInvalid);
    return code;
  }

  async function sendEmailCode(): Promise<void> {
    assertName();
    if (!EMAIL.test(value('email'))) throw new Error(copy.emailInvalid);
    try {
      const result = await call<CodeRequest>('requestEmail', { name: value('name'), email: value('email'), ...captchaFieldsFrom(form) });
      inputs.email.readOnly = true;
      show('email-code', true);
      notes.email.textContent = codeNote(copy, copy.emailCodeSent, result, { email: value('email') });
    } finally {
      // A captcha code is spent whether the answer was right or wrong.
      reloadCaptcha(form);
    }
  }

  async function verifyEmail(): Promise<void> {
    const { token } = await call<{ token: string }>('verifyEmail', { email: value('email'), code: codeOf('email_code') });
    proofs.email = token;
    show('email-code', false);
    show('email-done', true);
    show('phone', true);
    captcha.hidden = true;
  }

  async function sendPhoneCode(): Promise<void> {
    assertPhone();
    const result = await call<CodeRequest>('requestPhone', { email_token: proofs.email, phone_extension: DIAL_CODE, phone_number: phone() });
    inputs.phone_number.readOnly = true;
    show('phone-code', true);
    notes.phone.textContent = codeNote(copy, copy.phoneCodeSent, result, { phone: phone() });
  }

  async function verifyPhone(): Promise<void> {
    const { token } = await call<{ token: string }>('verifyPhone', { phone_extension: DIAL_CODE, phone_number: phone(), code: codeOf('phone_code') });
    proofs.phone = token;
    show('phone-send', false);
    show('phone-code', false);
    show('phone-done', true);
  }

  /** Back to the start: a different mailbox needs its own code, and the phone proof goes with it. */
  function changeEmail(): void {
    proofs.email = null;
    proofs.phone = null;
    inputs.email.readOnly = false;
    inputs.phone_number.readOnly = false;
    inputs.verify_phone.checked = false;
    for (const name of ['email-code', 'email-done', 'phone', 'phone-send', 'phone-code', 'phone-done'] as const) show(name, false);
    captcha.hidden = false;
    submitButton.disabled = true;
    showError(errBox, null);
  }

  async function submit(): Promise<void> {
    if (!proofs.email) return;
    assertName();
    assertPhone();
    const result = await call<SubmitResult>('submit', {
      name: value('name'),
      email_token: proofs.email,
      phone_extension: DIAL_CODE,
      phone_number: phone(),
      ...(proofs.phone ? { phone_token: proofs.phone } : {}),
    });
    const thanks = fillCopy(copy.doneText, { name: value('name'), email: value('email') });
    notes['done-title'].textContent = copy.doneTitle;
    notes['done-text'].textContent = result.already_registered ? `${thanks} ${copy.doneUpdated}` : thanks;
    proofs.email = null;
    show('fields', false);
    show('done', true);
  }

  const actions: Record<string, () => Promise<void>> = {
    'send-email': sendEmailCode,
    'verify-email': verifyEmail,
    'send-phone': sendPhoneCode,
    'verify-phone': verifyPhone,
  };

  form.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-vk-action]');
    if (!button) return;
    // Matched on the attribute, so it is always present.
    const action = String(button.dataset.vkAction);
    if (action === 'change-email') changeEmail();
    else if (action in actions) detach(step(button, actions[action]), 'venue-kit-interest');
  });

  inputs.verify_phone.addEventListener('change', () => {
    const checked = inputs.verify_phone.checked;
    show('phone-send', checked && proofs.phone === null);
    // Opting out before the code is typed frees the number again.
    if (!checked && proofs.phone === null) {
      show('phone-code', false);
      inputs.phone_number.readOnly = false;
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    detach(step(submitButton, submit), 'venue-kit-interest');
  });
}
