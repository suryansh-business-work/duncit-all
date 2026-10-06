/**
 * CMS widget `contact-form`: the "send us a message" form. It lands in the
 * Website portal's Contact Submissions inbox through `submitContactForm`.
 *
 * Root: the `<form>` itself, with
 *   - `data-graphql-url` — where to POST;
 *   - `data-copy` — JSON `{ sending, sent, send, failed, failedRetry }`;
 *   - fields `name`, `email`, `subject`, `message` and the captcha widget;
 *   - an error line marked `[data-form-error]`.
 */
import { captchaFieldsFrom } from '@duncit/captcha';
import { claimRoot, detach, formText, readJson, showError } from './dom';
import { submitForm } from './form-submit';

interface ContactCopy {
  sending: string;
  sent: string;
  send: string;
  failed: string;
  failedRetry: string;
}

const SUBMIT_CONTACT =
  'mutation Submit($input: SubmitContactInput!) { submitContactForm(input: $input) { ok message } }';

export function mount(root: HTMLElement): void {
  if (!(root instanceof HTMLFormElement) || !claimRoot(root)) return;
  const form = root;
  const url = form.dataset.graphqlUrl ?? '';
  const errBox = form.querySelector<HTMLElement>('[data-form-error]');
  const copy = readJson<ContactCopy>(form.dataset.copy);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    showError(errBox, null);
    const data = new FormData(form);
    const input = {
      name: formText(data, 'name'),
      email: formText(data, 'email'),
      subject: formText(data, 'subject'),
      message: formText(data, 'message'),
      ...captchaFieldsFrom(form),
    };
    detach(submitForm(
      form,
      errBox,
      { url, query: SUBMIT_CONTACT, input, field: 'submitContactForm' },
      {
        busy: copy.sending,
        done: copy.sent,
        idle: copy.send,
        failed: copy.failed,
        failedRetry: copy.failedRetry,
      }
    ), 'contact-form');
  });
}
