// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captcha = vi.hoisted(() => ({
  reloadCaptcha: vi.fn(),
  showCaptchaFailure: vi.fn(() => false),
  captchaFieldsFrom: vi.fn(() => ({ captchaId: 'c1', captchaAnswer: '7' })),
}));
vi.mock('@duncit/captcha', () => captcha);

import { mount } from '../../src/widgets/contact-form';
import { stubFetch } from './helpers';

const copy = { sending: 'Sending', sent: 'Sent', send: 'Send', failed: 'Failed', failedRetry: 'Retry' };

function build(): HTMLFormElement {
  document.body.innerHTML = `<form data-graphql-url="https://api.test/gql" data-copy='${JSON.stringify(copy)}'>
    <input name="name" value="  Asha "/><input name="email" value="a@b.co"/>
    <input name="subject" value="Hi"/><textarea name="message">Hello there</textarea>
    <p data-form-error class="hidden">stale</p><button>Send</button></form>`;
  return document.querySelector('form') as HTMLFormElement;
}

const submit = (form: HTMLFormElement) => form.dispatchEvent(new Event('submit', { cancelable: true }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('contact-form mount', () => {
  it('submits the trimmed fields with the captcha answer to submitContactForm', async () => {
    const form = build();
    const fetchMock = stubFetch({ data: { submitContactForm: { ok: true } } });
    mount(form);
    submit(form);
    await vi.advanceTimersByTimeAsync(0);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/gql');
    expect(body.query).toContain('submitContactForm');
    expect(body.variables.input).toEqual({
      name: 'Asha',
      email: 'a@b.co',
      subject: 'Hi',
      message: 'Hello there',
      captchaId: 'c1',
      captchaAnswer: '7',
    });
    expect(form.querySelector('button')?.innerHTML).toContain('Sent');
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('');
  });

  it('surfaces a failed send in the error line', async () => {
    const form = build();
    stubFetch({ data: { submitContactForm: { ok: false } } });
    mount(form);
    submit(form);
    await vi.advanceTimersByTimeAsync(0);
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('Failed');
  });

  it('does not mount twice on the same root', async () => {
    const form = build();
    const fetchMock = stubFetch({ data: { submitContactForm: { ok: true } } });
    mount(form);
    mount(form);
    submit(form);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a root that is not a form', () => {
    document.body.innerHTML = '<div id="r"></div>';
    const root = document.getElementById('r') as HTMLElement;
    mount(root);
    expect(root.dataset.cmsMounted).toBeUndefined();
  });

  it('falls back to an empty url when the attribute is missing', async () => {
    document.body.innerHTML = '<form><button>Go</button></form>';
    const form = document.querySelector('form') as HTMLFormElement;
    const fetchMock = stubFetch({ data: {} });
    mount(form);
    submit(form);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });
});
