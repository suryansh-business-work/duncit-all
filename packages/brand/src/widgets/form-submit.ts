/**
 * The submit round-trip the public "send us a message" forms share (contact,
 * ask-a-question): spinner on the button, the mutation, the captcha's own
 * failure message, a tick on success, and the button back after a pause.
 */
import { reloadCaptcha, showCaptchaFailure } from '@duncit/captcha';
import { postGraphql, showError } from './dom';

export interface SubmitCopy {
  /** Button label while the request is in flight. */
  busy: string;
  /** Button label once it landed. */
  done: string;
  /** The button's own label, when its original markup is unavailable. */
  idle: string;
  /** Thrown when the server answers without `ok`. */
  failed: string;
  /** Shown when the failure carried no message of its own. */
  failedRetry: string;
}

export interface SubmitRequest {
  url: string;
  query: string;
  input: Record<string, unknown>;
  /** The mutation's field on `data`, whose `ok` says it landed. */
  field: string;
}

type OkResult = Record<string, { ok?: boolean } | null | undefined>;

/** How long the finished button stays disabled before it can be pressed again. */
const BUTTON_RESET_MS = 3000;

const DONE_ICON = '<i class="fa-solid fa-check"></i>';
const BUSY_ICON = '<i class="fa-solid fa-spinner fa-spin"></i>';

/** Send the form; the caller has already validated and cleared its error line. */
export async function submitForm(
  form: HTMLFormElement,
  errBox: HTMLElement | null,
  request: SubmitRequest,
  copy: SubmitCopy
): Promise<void> {
  const btn = form.querySelector('button');
  const orig = btn?.innerHTML;
  const restore = () => {
    if (btn) btn.innerHTML = orig || copy.idle;
  };
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${BUSY_ICON} ${copy.busy}`;
  }
  try {
    const json = await postGraphql<OkResult>(request.url, request.query, { input: request.input });
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
    if (!json?.data?.[request.field]?.ok) throw new Error(copy.failed);
    if (btn) btn.innerHTML = `${DONE_ICON} ${copy.done}`;
    form.reset();
    reloadCaptcha(form);
  } catch (err) {
    showError(errBox, (err instanceof Error && err.message) || copy.failedRetry);
    reloadCaptcha(form);
    restore();
  } finally {
    window.setTimeout(() => {
      if (!btn) return;
      btn.disabled = false;
      if (!btn.innerHTML.includes('check')) restore();
    }, BUTTON_RESET_MS);
  }
}
