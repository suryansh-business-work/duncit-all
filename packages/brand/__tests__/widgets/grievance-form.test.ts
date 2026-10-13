// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captcha = vi.hoisted(() => ({
  reloadCaptcha: vi.fn(),
  showCaptchaFailure: vi.fn(() => false),
  captchaFieldsFrom: vi.fn(() => ({ captchaId: 'c1' })),
}));
vi.mock('@duncit/captcha', () => captcha);

import { mount } from '../../src/widgets/grievance-form';
import { flush, stubFetch, stubFetchReject } from './helpers';

function build(opts: { source?: boolean; err?: boolean; page?: boolean; btn?: boolean } = {}): HTMLFormElement {
  const { source = true, err = true, page = true, btn = true } = opts;
  document.body.innerHTML = `
    <form id="f" data-graphql-url="https://api.test/gql" ${source ? 'data-source="APP"' : ''}
      data-failed="No reference" data-sending="Submitting">
      <input name="name" value=" Asha "/><input name="email" value="a@b.co"/>
      <input name="subject" value="S"/><textarea name="description">D</textarea>
      ${err ? '<p data-form-error>old</p>' : ''}
      ${btn ? '<button>Submit</button>' : ''}
    </form>
    ${
      page
        ? '<div data-grievance-ladder></div><div data-grievance-done class="hidden"><span data-grievance-ref></span></div>'
        : ''
    }`;
  return document.getElementById('f') as HTMLFormElement;
}

const submit = (form: HTMLFormElement) => form.dispatchEvent(new Event('submit', { cancelable: true }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  captcha.reloadCaptcha.mockClear();
  captcha.showCaptchaFailure.mockReset().mockReturnValue(false);
});
afterEach(() => vi.unstubAllGlobals());

describe('grievance-form mount', () => {
  it('posts every field with the source and captcha, then swaps the form for the reference', async () => {
    const form = build();
    const fetchMock = stubFetch({ data: { submitGrievance: { grievance_no: 'GR-42' } } });
    mount(form);
    submit(form);
    expect(form.querySelector('button')?.disabled).toBe(true);
    expect(form.querySelector('button')?.innerHTML).toContain('Submitting');
    await flush();
    const input = JSON.parse(fetchMock.mock.calls[0][1].body).variables.input;
    expect(input).toMatchObject({ source: 'APP', name: 'Asha', email: 'a@b.co', subject: 'S', description: 'D', captchaId: 'c1' });
    expect(input.phone).toBe('');
    expect(input.support_ticket_ref).toBe('');
    expect(document.querySelector('[data-grievance-ref]')?.textContent).toBe('GR-42');
    expect(form.classList.contains('hidden')).toBe(true);
    expect(document.querySelector('[data-grievance-ladder]')?.classList.contains('hidden')).toBe(true);
    expect(document.querySelector('[data-grievance-done]')?.classList.contains('hidden')).toBe(false);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('defaults the source to WEBSITE and hides the stale error line on submit', async () => {
    const form = build({ source: false });
    const fetchMock = stubFetch({ data: { submitGrievance: { grievance_no: 'GR-1' } } });
    mount(form);
    submit(form);
    expect(form.querySelector('[data-form-error]')?.classList.contains('hidden')).toBe(true);
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables.input.source).toBe('WEBSITE');
  });

  it('shows the server message, reloads the captcha and restores the button', async () => {
    const form = build();
    stubFetch({ errors: [{ message: 'Invalid email' }] });
    mount(form);
    submit(form);
    await flush();
    const btn = form.querySelector('button') as HTMLButtonElement;
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('Invalid email');
    expect(captcha.reloadCaptcha).toHaveBeenCalledWith(form);
    expect(btn.disabled).toBe(false);
    expect(btn.innerHTML).toBe('Submit');
    expect(form.classList.contains('hidden')).toBe(false);
  });

  it('stays quiet when the captcha widget reported the failure itself', async () => {
    const form = build();
    captcha.showCaptchaFailure.mockReturnValue(true);
    stubFetch({ errors: [{ message: 'captcha' }] });
    mount(form);
    submit(form);
    await flush();
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('old');
    expect(captcha.reloadCaptcha).not.toHaveBeenCalled();
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the failed copy when the answer has no reference', async () => {
    const form = build();
    stubFetch({ data: { submitGrievance: null } });
    mount(form);
    submit(form);
    await flush();
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('No reference');
  });

  it('shows the failed copy for a non-Error rejection', async () => {
    const form = build();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('offline'));
    mount(form);
    submit(form);
    await flush();
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('No reference');
  });

  it('shows the thrown Error message for a network failure', async () => {
    const form = build();
    stubFetchReject(new Error('network down'));
    mount(form);
    submit(form);
    await flush();
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('network down');
  });

  it('works on a page without the success panel, ladder, error line or button', async () => {
    const form = build({ page: false, err: false, btn: false });
    stubFetch({ data: { submitGrievance: { grievance_no: 'GR-9' } } });
    mount(form);
    submit(form);
    await flush();
    expect(form.classList.contains('hidden')).toBe(true);
  });

  it('reports a failure on a form without a button', async () => {
    const form = build({ btn: false });
    stubFetch({ errors: [{ message: 'Boom' }] });
    mount(form);
    submit(form);
    await flush();
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('Boom');
  });

  it('shows no failure text and keeps an empty button when copy attributes are absent', async () => {
    document.body.innerHTML = '<form id="f"><button></button><p data-form-error></p></form>';
    const form = document.getElementById('f') as HTMLFormElement;
    stubFetch({ data: {} });
    mount(form);
    submit(form);
    await flush();
    expect(form.querySelector('[data-form-error]')?.textContent).toBe('');
    expect(form.querySelector('button')?.innerHTML).toBe('');
  });

  it('ignores a non-form root and a second mount', async () => {
    document.body.innerHTML = '<div id="d"></div>';
    const div = document.getElementById('d') as HTMLElement;
    mount(div);
    expect(div.dataset.cmsMounted).toBeUndefined();

    const form = build();
    const fetchMock = stubFetch({ data: { submitGrievance: { grievance_no: 'G' } } });
    mount(form);
    mount(form);
    submit(form);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
