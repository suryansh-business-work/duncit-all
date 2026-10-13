// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captcha = vi.hoisted(() => ({
  reloadCaptcha: vi.fn(),
  showCaptchaFailure: vi.fn(() => false),
  captchaFieldsFrom: vi.fn(() => ({ captchaId: 'c1' })),
}));
vi.mock('@duncit/captcha', () => captcha);

import { wireFaqAsk } from '../../src/widgets/faq-ask';
import { stubFetch } from './helpers';

const copy = {
  ask: 'Ask',
  sending: 'Sending',
  gotIt: 'Got it',
  tooShort: 'Too short',
  needEmail: 'Need email',
  failed: 'Failed',
  failedRetry: 'Retry',
};

function build(question: string, email: string, withErrBox = true): HTMLFormElement {
  document.body.innerHTML = `<form data-graphql-url="https://api.test/gql" data-copy='${JSON.stringify(copy)}'>
    <input name="question" value="${question}"/><input name="email" value="${email}"/>
    ${withErrBox ? '<p data-form-error class="hidden"></p>' : ''}<button>Ask</button></form>`;
  return document.querySelector('form') as HTMLFormElement;
}

const submit = (form: HTMLFormElement) => form.dispatchEvent(new Event('submit', { cancelable: true }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('wireFaqAsk', () => {
  it('rejects a question shorter than five characters without calling the API', () => {
    const form = build('Why', 'a@b.co');
    const fetchMock = stubFetch({});
    wireFaqAsk(form);
    submit(form);
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('Too short');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a question of exactly five characters', async () => {
    const form = build('Five?', 'a@b.co');
    const fetchMock = stubFetch({ data: { submitFaqQuestion: { ok: true } } });
    wireFaqAsk(form);
    submit(form);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires an email', () => {
    const form = build('How do pods work?', '   ');
    const fetchMock = stubFetch({});
    wireFaqAsk(form);
    submit(form);
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('Need email');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends question, email and captcha to submitFaqQuestion and ticks on success', async () => {
    const form = build('How do pods work?', 'a@b.co');
    const fetchMock = stubFetch({ data: { submitFaqQuestion: { ok: true } } });
    wireFaqAsk(form);
    submit(form);
    await vi.advanceTimersByTimeAsync(0);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toContain('submitFaqQuestion');
    expect(body.variables.input).toEqual({ question: 'How do pods work?', email: 'a@b.co', captchaId: 'c1' });
    expect(form.querySelector('button')?.innerHTML).toContain('Got it');
  });

  it('survives a form with no error line', () => {
    const form = build('Why', 'a@b.co', false);
    wireFaqAsk(form);
    expect(() => submit(form)).not.toThrow();
  });

  it('works without url or copy attributes', () => {
    document.body.innerHTML = '<form><input name="question" value="x"/></form>';
    const form = document.querySelector('form') as HTMLFormElement;
    wireFaqAsk(form);
    expect(() => submit(form)).not.toThrow();
  });
});
