// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captcha = vi.hoisted(() => ({
  reloadCaptcha: vi.fn(),
  showCaptchaFailure: vi.fn(() => false),
  captchaFieldsFrom: vi.fn(() => ({})),
}));
vi.mock('@duncit/captcha', () => captcha);

import { mount } from '../../src/widgets/careers-apply';
import { stubFetch } from './helpers';

const copy = { sending: 'Sending', sent: 'Sent', send: 'Apply', failed: 'Failed', failedRetry: 'Retry' };

let showModal: ReturnType<typeof vi.fn>;
let close: ReturnType<typeof vi.fn>;
let addSpy: ReturnType<typeof vi.spyOn>;

function build(opts: { form?: boolean; title?: boolean; err?: boolean; btn?: boolean } = {}): HTMLDialogElement {
  const { form = true, title = true, err = true, btn = true } = opts;
  document.body.innerHTML = `
    <button data-apply-role data-role-id="r1" data-role-title="Engineer" id="open"><b id="inner">Apply</b></button>
    <button data-apply-role data-role-title="Designer" id="open2">Apply</button>
    <p id="other">x</p>
    <dialog id="d" data-graphql-url="https://api.test/gql" data-copy='${JSON.stringify(copy)}'>
      ${title ? '<span data-apply-role-title></span>' : ''}
      ${
        form
          ? `<form>
        <input name="name" value=" Asha " required/><input name="email" value="a@b.co"/>
        <input name="phone" value="1"/><input name="resume_url" value="r"/>
        <input name="portfolio_url" value=""/><textarea name="cover_note">hi</textarea>
        ${btn ? '<button type="submit">Apply now</button>' : ''}</form>`
          : ''
      }
      ${err ? '<p data-form-error class="hidden"></p>' : ''}
      <button data-apply-close id="x">Close</button>
    </dialog>`;
  return document.getElementById('d') as HTMLDialogElement;
}

const el = (id: string) => document.getElementById(id) as HTMLElement;
const submit = (dialog: HTMLElement) =>
  (dialog.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

beforeEach(() => {
  vi.useFakeTimers();
  showModal = vi.fn();
  close = vi.fn();
  addSpy = vi.spyOn(document, 'addEventListener');
  HTMLDialogElement.prototype.showModal = showModal as unknown as () => void;
  HTMLDialogElement.prototype.close = close as unknown as () => void;
});
afterEach(() => {
  // mount() registers a document-level click listener; drop each test's so a
  // previous test's dialog does not react to this test's clicks.
  for (const [type, listener] of addSpy.mock.calls) {
    document.removeEventListener(type, listener as EventListener);
  }
  addSpy.mockRestore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('careers-apply mount', () => {
  it('opens the dialog for the clicked role, with a clean form', () => {
    const dialog = build();
    mount(dialog);
    const input = dialog.querySelector('input[name=name]') as HTMLInputElement;
    input.value = 'dirty';
    (dialog.querySelector('[data-form-error]') as HTMLElement).textContent = 'old error';
    el('inner').click();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.querySelector('[data-apply-role-title]')?.textContent).toBe('Engineer');
    expect(input.value).toBe(' Asha ');
    expect(dialog.querySelector('[data-form-error]')?.textContent).toBe('');
  });

  it('closes on the close button and ignores unrelated clicks', () => {
    const dialog = build();
    mount(dialog);
    el('other').click();
    expect(close).not.toHaveBeenCalled();
    el('x').click();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('submits the role and trimmed fields, then closes after the tick', async () => {
    const dialog = build();
    const fetchMock = stubFetch({ data: { submitJobApplication: { ok: true } } });
    mount(dialog);
    el('open').click();
    submit(dialog);
    await vi.advanceTimersByTimeAsync(0);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toContain('submitJobApplication');
    expect(body.variables.input).toEqual({
      role_content_id: 'r1',
      role_title: 'Engineer',
      name: 'Asha',
      email: 'a@b.co',
      phone: '1',
      resume_url: 'r',
      portfolio_url: '',
      cover_note: 'hi',
    });
    expect(close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1800);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('sends a null role id for an opener without data-role-id', async () => {
    const dialog = build();
    const fetchMock = stubFetch({ data: { submitJobApplication: { ok: true } } });
    mount(dialog);
    el('open2').click();
    submit(dialog);
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables.input.role_content_id).toBeNull();
  });

  it('keeps the dialog open and shows the error when the application fails', async () => {
    const dialog = build();
    stubFetch({ data: { submitJobApplication: { ok: false } } });
    mount(dialog);
    el('open').click();
    submit(dialog);
    await vi.advanceTimersByTimeAsync(5000);
    expect(dialog.querySelector('[data-form-error]')?.textContent).toBe('Failed');
    expect(close).not.toHaveBeenCalled();
  });

  it('does not send before a role was chosen', async () => {
    const dialog = build();
    const fetchMock = stubFetch({});
    mount(dialog);
    submit(dialog);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not send while the form is invalid', async () => {
    const dialog = build();
    const fetchMock = stubFetch({});
    mount(dialog);
    el('open').click();
    (dialog.querySelector('input[name=name]') as HTMLInputElement).value = '';
    submit(dialog);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-enables and restores the submit button when reopened', async () => {
    const dialog = build();
    stubFetch({ data: { submitJobApplication: { ok: true } } });
    mount(dialog);
    el('open').click();
    submit(dialog);
    await vi.advanceTimersByTimeAsync(0);
    const btn = dialog.querySelector('form button') as HTMLButtonElement;
    expect(btn.innerHTML).toContain('Sent');
    el('open').click();
    expect(btn.disabled).toBe(false);
    expect(btn.innerHTML).toBe('Apply now');
  });

  it('tolerates a missing title element, error line and button', async () => {
    const dialog = build({ title: false, err: false, btn: false });
    stubFetch({ data: { submitJobApplication: { ok: true } } });
    mount(dialog);
    el('open').click();
    submit(dialog);
    await vi.advanceTimersByTimeAsync(2000);
    expect(showModal).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a form, for a non-dialog root, or on a second mount', () => {
    const noForm = build({ form: false });
    mount(noForm);
    el('open').click();
    expect(showModal).not.toHaveBeenCalled();

    document.body.innerHTML = '<div id="r"></div>';
    const div = el('r');
    mount(div);
    expect(div.dataset.cmsMounted).toBeUndefined();

    const dialog = build();
    mount(dialog);
    mount(dialog);
    el('open').click();
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it('falls back to empty url, copy and a missing role title', () => {
    document.body.innerHTML = `<button data-apply-role id="o">Apply</button>
      <dialog id="d"><form><button>Go</button></form></dialog>`;
    const dialog = el('d') as HTMLDialogElement;
    mount(dialog);
    el('o').click();
    expect(showModal).toHaveBeenCalled();
  });

  it('ignores non-element click targets', () => {
    const dialog = build();
    mount(dialog);
    document.dispatchEvent(new Event('click'));
    expect(showModal).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
