/**
 * CMS widget `careers-apply`: the "apply for this role" dialog. Every element
 * on the page marked `[data-apply-role]` opens it for its role, and the
 * application lands in the Website portal's Job Applications inbox through
 * `submitJobApplication`.
 *
 * Root: the `<dialog>`, with
 *   - `data-graphql-url` — where to POST;
 *   - `data-copy` — JSON `{ sending, sent, send, failed, failedRetry }`;
 *   - a `<form>` with fields `name`, `email`, `phone`, `resume_url`,
 *     `portfolio_url`, `cover_note`;
 *   - the role's title in `[data-apply-role-title]`, a close button
 *     `[data-apply-close]` OUTSIDE the form (submitForm drives the form's first
 *     button) and an error line `[data-form-error]`.
 * Each opener carries `data-role-title` and, optionally, `data-role-id`.
 */
import { claimRoot, detach, formText, readJson, showError } from './dom';
import { submitForm, type SubmitCopy } from './form-submit';

const SUBMIT_APPLICATION =
  'mutation Apply($input: SubmitJobApplicationInput!) { submitJobApplication(input: $input) { ok message } }';

/** Long enough to read the tick on the button before the dialog closes. */
const CLOSE_AFTER_MS = 1800;

interface ApplyCopy {
  sending: string;
  sent: string;
  send: string;
  failed: string;
  failedRetry: string;
}

export function mount(root: HTMLElement): void {
  if (!(root instanceof HTMLDialogElement) || !claimRoot(root)) return;
  const dialog = root;
  const form = dialog.querySelector('form');
  if (!form) return;
  const url = dialog.dataset.graphqlUrl ?? '';
  const copy = readJson<ApplyCopy>(dialog.dataset.copy);
  const submitCopy: SubmitCopy = { busy: copy.sending, done: copy.sent, idle: copy.send, failed: copy.failed, failedRetry: copy.failedRetry };
  const titleEl = dialog.querySelector<HTMLElement>('[data-apply-role-title]');
  const errBox = dialog.querySelector<HTMLElement>('[data-form-error]');
  // The form's only button: submitForm drives the first one, and leaves it reading "sent" after a success.
  const submitBtn = form.querySelector('button');
  const idleLabel = submitBtn?.innerHTML ?? '';
  let role: { id: string | null; title: string } | null = null;

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const opener = target?.closest<HTMLElement>('[data-apply-role]');
    if (opener) {
      role = { id: opener.dataset.roleId || null, title: opener.dataset.roleTitle ?? '' };
      if (titleEl) titleEl.textContent = role.title;
      form.reset();
      showError(errBox, null);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = idleLabel;
      }
      dialog.showModal();
      return;
    }
    if (target?.closest('[data-apply-close]')) dialog.close();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    showError(errBox, null);
    if (!role || !form.reportValidity()) return;
    const data = new FormData(form);
    const input = {
      role_content_id: role.id,
      role_title: role.title,
      name: formText(data, 'name'),
      email: formText(data, 'email'),
      phone: formText(data, 'phone'),
      resume_url: formText(data, 'resume_url'),
      portfolio_url: formText(data, 'portfolio_url'),
      cover_note: formText(data, 'cover_note'),
    };
    detach(
      submitForm(form, errBox, { url, query: SUBMIT_APPLICATION, input, field: 'submitJobApplication' }, submitCopy).then(() => {
        // submitForm shows the error itself; only a landed application closes the dialog.
        if (!errBox?.textContent) globalThis.setTimeout(() => dialog.close(), CLOSE_AFTER_MS);
      }),
      'careers-apply'
    );
  });
}
