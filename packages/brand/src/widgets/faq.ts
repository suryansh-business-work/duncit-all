/**
 * CMS widget `faq`. It has two kinds of root, each marked
 * `data-cms-widget="faq"` and each with its own `data-graphql-url`:
 *
 *   - the FAQ list — any non-form element; `data-copy` JSON `{ empty, error }`.
 *     Its children (skeletons) are replaced by the live `publicFaqGroups`.
 *   - the ask-a-question `<form>` — fields `question` and `email`, the captcha
 *     widget, an error line `[data-form-error]`, and `data-copy` JSON
 *     `{ ask, sending, gotIt, tooShort, needEmail, failed, failedRetry }`.
 */
import { claimRoot, detach } from './dom';
import { wireFaqAsk } from './faq-ask';
import { loadFaqGroups } from './faq-list';

export function mount(root: HTMLElement): void {
  if (!claimRoot(root)) return;
  if (root instanceof HTMLFormElement) {
    wireFaqAsk(root);
    return;
  }
  detach(loadFaqGroups(root), 'faq');
}
