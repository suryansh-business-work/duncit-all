/**
 * The ask-a-question half of the `faq` widget: a question and an email, sent
 * to the Support portal through `submitFaqQuestion`.
 */
import { captchaFieldsFrom } from '@duncit/captcha';
import { detach, formText, readJson, showError } from './dom';
import { submitForm } from './form-submit';

interface AskCopy {
  ask: string;
  sending: string;
  gotIt: string;
  tooShort: string;
  needEmail: string;
  failed: string;
  failedRetry: string;
}

/** Shorter than this is not a question anyone can answer. */
const MIN_QUESTION_LENGTH = 5;

const SUBMIT_FAQ_QUESTION =
  'mutation Ask($input: SubmitFaqQuestionInput!) { submitFaqQuestion(input: $input) { ok message } }';

/** Wire the ask form (its `data-copy` holds the AskCopy JSON). */
export function wireFaqAsk(form: HTMLFormElement): void {
  const url = form.dataset.graphqlUrl ?? '';
  const errBox = form.querySelector<HTMLElement>('[data-form-error]');
  const copy = readJson<AskCopy>(form.dataset.copy);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    showError(errBox, null);
    const data = new FormData(form);
    const input = {
      question: formText(data, 'question'),
      email: formText(data, 'email'),
      ...captchaFieldsFrom(form),
    };
    if (input.question.length < MIN_QUESTION_LENGTH) {
      showError(errBox, copy.tooShort);
      return;
    }
    if (!input.email) {
      showError(errBox, copy.needEmail);
      return;
    }
    detach(submitForm(
      form,
      errBox,
      { url, query: SUBMIT_FAQ_QUESTION, input, field: 'submitFaqQuestion' },
      {
        busy: copy.sending,
        done: copy.gotIt,
        idle: copy.ask,
        failed: copy.failed,
        failedRetry: copy.failedRetry,
      }
    ), 'faq-ask');
  });
}
