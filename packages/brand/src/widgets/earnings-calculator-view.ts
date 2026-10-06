/**
 * The `earnings-calculator` panel: slider labels, the role's duties and
 * fields, and the take-home with the rows that add up to it.
 */
import { setCalculatorNote } from './calculator-note';
import type { EarnConfig, EarnCopy, EarnRole, EarnSnapshot, Waterfall } from './earnings-calculator-types';

// Which waterfall line each row shows. One map, so a row can never be
// labelled as one thing and filled from another.
const ROW_FIELD: Readonly<Record<string, string>> = {
  gross: 'amount',
  gst: 'gst_amount',
  platform: 'platform_fee_amount',
  venue: 'venue_amount',
  clubAdmin: 'club_admin_amount',
  hostCommission: 'host_commission_amount',
};

const TAKE_HOME_CLASS = 'font-head text-4xl font-extrabold';
const EMPTY_FIGURE = '—';

export interface EarnView {
  note: HTMLElement | null;
  syncLabels: () => void;
  paintRole: (role: EarnRole) => void;
  paint: (role: EarnRole, w: Waterfall) => void;
  showUnavailable: (message: string) => void;
  snapshot: (role: EarnRole, w: Waterfall) => EarnSnapshot;
}

const dutyItem = (duty: string): string =>
  `<li class="flex gap-2 text-sm text-ink-soft"><i class="fa-solid fa-check mt-1 text-xs text-primary" aria-hidden="true"></i><span>${duty}</span></li>`;

const breakdownRow = (label: string, text: string, deduction: boolean): string => {
  const tone = deduction ? 'text-ink-soft' : 'font-bold text-ink';
  return `<div class="flex items-baseline justify-between gap-3"><dt class="${tone}">${label}</dt><dd class="${tone}">${text}</dd></div>`;
};

export function createEarnView(root: HTMLElement, form: HTMLFormElement, config: EarnConfig, copy: EarnCopy): EarnView {
  const rows = root.querySelector('[data-earn-rows]');
  const takeHome = root.querySelector('[data-earn-takehome]');
  const label = root.querySelector('[data-earn-label]');
  const dutiesTitle = root.querySelector('[data-duties-title]');
  const duties = root.querySelector('[data-duties]');
  const note = root.querySelector<HTMLElement>('[data-earn-note]');

  // Paise precision, never rounded per line: the server's waterfall reconciles
  // exactly at two decimals, so the deduction column sums to the take-home.
  const money = (value: number) =>
    `${config.currency}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const sliderValue = (name: string) => Number(new FormData(form).get(name)) || 0;
  /** How many pods this role's earnings run across — one, unless the role says otherwise. */
  const multiplier = (role: EarnRole) => (role.multiplier ? sliderValue(role.multiplier) : 1);

  /** One row: money lines are for the MONTH, like the take-home; the per-pod
   * share stays per pod, which is what its label says. */
  const rowValue = (role: EarnRole, key: string, w: Waterfall) => {
    if (key === 'perPod') return { text: money(w[role.field]), deduction: false };
    if (key === 'pods') return { text: `× ${multiplier(role)}`, deduction: false };
    const value = w[ROW_FIELD[key]] * multiplier(role);
    const deduction = key !== 'gross';
    return { text: deduction && value > 0 ? `− ${money(value)}` : money(value), deduction };
  };

  const setTakeHome = (text: string, tone: string) => {
    if (!takeHome) return;
    takeHome.textContent = text;
    takeHome.className = `${TAKE_HOME_CLASS} ${tone}`;
  };

  const paint = (role: EarnRole, w: Waterfall) => {
    if (label) label.textContent = role.takeHomeLabel;
    if (rows) {
      rows.innerHTML = role.rows
        .map((key) => {
          const { text, deduction } = rowValue(role, key, w);
          return breakdownRow(config.rowLabels[key], text, deduction);
        })
        .join('');
    }
    // The rate this role is paid on is zero — a confident ₹0 would read as
    // "this pays nothing" rather than "this is not set up yet".
    if (role.rateField && !w[role.rateField]) {
      setTakeHome(EMPTY_FIGURE, 'text-ink-soft');
      setCalculatorNote(note, copy.noShareNote, true);
      return;
    }
    const total = w[role.field] * multiplier(role);
    // Nothing left, or a shortfall: the server reports the real gap rather
    // than clamping it, so the page says what to do about it.
    const short = total <= 0;
    setTakeHome(money(total), short ? 'text-primary-dark' : 'text-ink');
    setCalculatorNote(note, short ? copy.shortfallNote : copy.note, short);
  };

  const paintRole = (role: EarnRole) => {
    if (dutiesTitle) dutiesTitle.textContent = role.dutiesTitle;
    if (duties) duties.innerHTML = role.duties.map(dutyItem).join('');
    // Only the role's own sliders show (e.g. the pod count for a club admin).
    for (const field of form.querySelectorAll<HTMLElement>('[data-field]')) {
      const only = field.dataset.fieldRoles;
      field.hidden = Boolean(only) && !(only ?? '').split(',').includes(role.key);
    }
  };

  const syncLabels = () => {
    for (const input of form.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      const out = root.querySelector(`[data-out="${input.name}"]`);
      if (out) out.textContent = `${input.dataset.prefix ?? ''}${Number(input.value).toLocaleString('en-IN')}`;
    }
  };

  const showUnavailable = (message: string) => {
    if (takeHome) takeHome.textContent = EMPTY_FIGURE;
    setCalculatorNote(note, message, true);
  };

  const snapshot = (role: EarnRole, w: Waterfall): EarnSnapshot => ({
    role,
    fields: config.fields,
    rowLabels: config.rowLabels,
    copy,
    takeHome: takeHome?.textContent ?? '',
    sliderValue,
    rowText: (key) => rowValue(role, key, w).text,
  });

  return { note, syncLabels, paintRole, paint, showUnavailable, snapshot };
}
