/**
 * CMS widget `grievance-form`: the no-login grievance form. A grievance that
 * lands replaces the form with its reference number.
 *
 * Root: the `<form>` itself, with
 *   - `data-graphql-url` — where to POST `submitGrievance`;
 *   - `data-source` — the grievance's source channel (e.g. `WEBSITE`);
 *   - `data-failed` — shown when the server answers without a reference;
 *   - `data-sending` — the button label while submitting;
 *   - the fields in GRIEVANCE_FIELDS, the captcha widget, and an error line
 *     marked `[data-form-error]`.
 * Outside the form, anywhere on the page:
 *   - `[data-grievance-done]` — the success panel, shown once it lands;
 *   - `[data-grievance-ref]` — where the reference number is written;
 *   - `[data-grievance-ladder]` — the escalation steps, hidden with the form.
 */
import { captchaFieldsFrom, reloadCaptcha, showCaptchaFailure } from '@duncit/captcha';
import { SUBMIT_GRIEVANCE_SDL } from '@duncit/utils';
import { claimRoot, detach, formText, postGraphql, showError } from './dom';

const GRIEVANCE_FIELDS = [
  'support_ticket_ref',
  'name',
  'email',
  'phone',
  'address',
  'subject',
  'description',
] as const;

const BUSY_ICON = '<i class="fa-solid fa-spinner fa-spin"></i>';

type GrievanceResult = { submitGrievance?: { grievance_no?: string } | null };

function grievanceInput(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const input: Record<string, string> = { source: form.dataset.source || 'WEBSITE' };
  for (const key of GRIEVANCE_FIELDS) input[key] = formText(data, key);
  return Object.assign(input, captchaFieldsFrom(form));
}

/** The reference replaces the form: there is nothing left to do here, and
 * leaving the fields filled invites a duplicate grievance. */
function showLanded(form: HTMLFormElement, grievanceNo: string): void {
  const ref = document.querySelector('[data-grievance-ref]');
  const done = document.querySelector('[data-grievance-done]');
  if (ref) ref.textContent = grievanceNo;
  form.classList.add('hidden');
  // The ladder was instructions for filling the form; with the form gone it
  // would read as a warning about a grievance that has already landed.
  document.querySelector('[data-grievance-ladder]')?.classList.add('hidden');
  done?.classList.remove('hidden');
  done?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function submit(form: HTMLFormElement, errBox: HTMLElement | null): Promise<void> {
  const failedMessage = form.dataset.failed ?? '';
  const btn = form.querySelector('button');
  const orig = btn?.innerHTML;
  const restore = () => {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = orig || '';
  };
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${BUSY_ICON} ${form.dataset.sending ?? ''}`;
  }
  try {
    const json = await postGraphql<GrievanceResult>(form.dataset.graphqlUrl ?? '', SUBMIT_GRIEVANCE_SDL, {
      input: grievanceInput(form),
    });
    // A code is spent whether the answer was right or wrong, so the widget
    // always gets a new one — and when the captcha WAS the reason, it says so
    // itself and this handler stays quiet.
    if (json?.errors?.length) {
      if (showCaptchaFailure(form, json.errors)) {
        restore();
        return;
      }
      throw new Error(json.errors[0].message);
    }
    const grievanceNo = json?.data?.submitGrievance?.grievance_no;
    if (!grievanceNo) throw new Error(failedMessage);
    showLanded(form, grievanceNo);
  } catch (err) {
    showError(errBox, err instanceof Error ? err.message : failedMessage);
    reloadCaptcha(form);
    restore();
  }
}

export function mount(root: HTMLElement): void {
  if (!(root instanceof HTMLFormElement) || !claimRoot(root)) return;
  const form = root;
  const errBox = form.querySelector<HTMLElement>('[data-form-error]');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    errBox?.classList.add('hidden');
    detach(submit(form, errBox), 'grievance-form');
  });
}
