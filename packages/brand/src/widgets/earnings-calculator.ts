/**
 * CMS widget `earnings-calculator` (earnwith site): move the sliders, watch
 * what a pod actually pays — as a host, or as the club admin whose club it
 * runs under. Every figure is the server's own settlement waterfall
 * (`publicPodEarningsEstimate`), so the page cannot drift from real payouts.
 *
 * Root: the calculator section, with
 *   - `data-graphql-url` — where to POST the estimate query;
 *   - `data-print-logo` — the logo drawn on the PDF (PNG/JPEG; else a wordmark);
 *   - `data-config` — JSON EarnConfig `{ roles, fields, rowLabels, currency }`;
 *   - `data-copy` — JSON EarnCopy `{ note, shortfallNote, noShareNote,
 *     loadError, disclaimer, pdf: { title, inputsTitle, breakdownTitle, footer,
 *     preparing, error, fileName } }`.
 * Inside it: tabs `[data-role-tab="<role key>"]`; `form[data-earn-form]` with
 * range inputs named `ticket`, `spots`, `venue` (+ the multiplier, `pods`),
 * each in a `[data-field][data-field-roles]` label and labelled by
 * `[data-out="<name>"]` (prefix from the input's `data-prefix`);
 * `[data-earn-label]`, `[data-earn-takehome]`, `[data-earn-rows]`,
 * `[data-earn-note]`, `[data-duties-title]`, `[data-duties]`; and the PDF
 * button `[data-print-estimate]`.
 */
import { setCalculatorNote } from './calculator-note';
import { claimRoot, detach, postGraphql, readJson } from './dom';
import { loadJsPdf, loadLogo } from './earnings-calculator-pdf-lib';
import { buildEstimatePdf } from './earnings-calculator-pdf';
import type { EarnConfig, EarnCopy, EarnRole, EarnSnapshot, Estimate } from './earnings-calculator-types';
import { createEarnView, type EarnView } from './earnings-calculator-view';

const ESTIMATE_QUERY = `query PublicPodEarnings($amount: Float!, $spots: Int!, $venue: Float) {
      publicPodEarningsEstimate(pod_amount: $amount, no_of_spots: $spots, venue_amount: $venue) {
        payable_spots
        waterfall {
          amount
          gst_amount
          platform_fee_amount
          venue_amount
          club_admin_pct
          club_admin_amount
          host_commission_amount
          host_receives
        }
      }
    }`;

/** The server does the maths; dragging a slider must not fire a request per pixel. */
const REQUEST_DEBOUNCE_MS = 180;

function wirePdfButton(root: HTMLElement, view: EarnView, copy: EarnCopy, snapshot: () => EarnSnapshot | null): void {
  const button = root.querySelector<HTMLButtonElement>('[data-print-estimate]');
  if (!button) return;
  const idleLabel = button.innerHTML;
  const logoSrc = root.dataset.printLogo ?? '';
  button.addEventListener('click', async () => {
    // Nothing to put in it yet — the figures are the server's, not a guess.
    const snap = snapshot();
    if (!snap) return;
    button.disabled = true;
    button.textContent = copy.pdf.preparing;
    try {
      const [JsPDF, logo] = await Promise.all([loadJsPdf(), loadLogo(logoSrc)]);
      buildEstimatePdf(JsPDF, logo, snap).save(copy.pdf.fileName);
    } catch {
      // Saying nothing would look like a dead button.
      setCalculatorNote(view.note, copy.pdf.error, true);
    } finally {
      button.disabled = false;
      button.innerHTML = idleLabel;
    }
  });
}

export function mount(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('form[data-earn-form]');
  if (!form || !claimRoot(root)) return;
  const config = readJson<EarnConfig>(root.dataset.config);
  const copy = readJson<EarnCopy>(root.dataset.copy);
  const view = createEarnView(root, form, config, copy);
  const tabs = [...root.querySelectorAll<HTMLElement>('[data-role-tab]')];
  let role: EarnRole = config.roles[0];
  let latest: Estimate | null = null;

  const repaint = () => {
    if (latest) view.paint(role, latest.waterfall);
  };

  // A blip after the numbers are up leaves them alone; a failure before any
  // numbers exist has to SAY so — an em dash and an empty list read as broken.
  const failed = () => {
    if (latest) return;
    view.showUnavailable(copy.loadError);
  };

  const request = async () => {
    const values = new FormData(form);
    const variables = {
      amount: Number(values.get('ticket')),
      spots: Number(values.get('spots')),
      venue: Number(values.get('venue')),
    };
    try {
      const json = await postGraphql<{ publicPodEarningsEstimate?: Estimate | null }>(
        root.dataset.graphqlUrl ?? '',
        ESTIMATE_QUERY,
        variables
      );
      const data = json?.data?.publicPodEarningsEstimate;
      if (data) {
        latest = data;
        repaint();
      } else {
        failed();
      }
    } catch {
      failed();
    }
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      role = config.roles.find((candidate) => candidate.key === tab.dataset.roleTab) ?? config.roles[0];
      for (const other of tabs) other.setAttribute('aria-selected', String(other === tab));
      view.paintRole(role);
      // Same figures, different line of them — switching roles asks the server nothing.
      repaint();
    });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  form.addEventListener('input', (event) => {
    view.syncLabels();
    // The pod count is not part of the pod's own maths — it multiplies the
    // answer, so it repaints without asking the server again.
    if (event.target instanceof HTMLInputElement && event.target.name === role.multiplier) {
      repaint();
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(request, REQUEST_DEBOUNCE_MS);
  });

  wirePdfButton(root, view, copy, () => (latest ? view.snapshot(role, latest.waterfall) : null));

  view.syncLabels();
  view.paintRole(role);
  detach(request(), 'earnings-calculator');
}
