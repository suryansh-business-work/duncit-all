/**
 * CMS widget `campaign-calculator` (ads site): tick placements, choose the
 * days, watch the phone light up and the price add itself. Every figure comes
 * from the platform's own rate card, re-read live on load.
 *
 * Root: the calculator section, with
 *   - `data-graphql-url` — where to read `publicAdRateCard` from;
 *   - `data-config` — JSON `{ initial: RateCard, defaultPick }`: the card baked
 *     in at build time (may have no entries) and the placement ticked first;
 *   - `data-copy` — JSON `{ perDaySuffix, note, emptyNote, failedNote, dayOne,
 *     daysMany }` (`dayOne` is the whole "1 day" label, `daysMany` follows the
 *     number).
 * Inside it: `form[data-ads-form]` holding `[data-placements]` (the chips,
 * `input[name="placement"]`) and `input[name="days"]`; `[data-days-out]`,
 * `[data-total]`, `[data-rows]`, `[data-note]`; and the phone's `[data-zone]`
 * slots, which get class `is-live` when their placement is ticked.
 * Anywhere on the page (optional): the rate table body
 * `[data-rate-rows][data-rate-empty]` plus `[data-placement-notes]`, filled
 * from the same fetch when the build shipped it empty.
 */
import { setCalculatorNote } from './calculator-note';
import { placementChip, placementNotes, priceRow, rateRow, type RateCard } from './campaign-calculator-markup';
import { claimRoot, detach, postGraphql, readJson } from './dom';

interface CampaignConfig {
  initial: RateCard;
  defaultPick: string;
}

interface CampaignCopy {
  perDaySuffix: string;
  note: string;
  emptyNote: string;
  failedNote: string;
  dayOne: string;
  daysMany: string;
}

const RATE_CARD = `query PublicAdRateCard {
              publicAdRateCard {
                currency_symbol
                min_days
                max_days
                entries { position label note price_per_day }
              }
            }`;

export function mount(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('form[data-ads-form]');
  const daysInput = form?.querySelector<HTMLInputElement>('input[name="days"]');
  if (!form || !daysInput || !claimRoot(root)) return;
  const config = readJson<CampaignConfig>(root.dataset.config);
  const copy = readJson<CampaignCopy>(root.dataset.copy);
  const chipBox = form.querySelector('[data-placements]');
  const rows = root.querySelector('[data-rows]');
  const total = root.querySelector('[data-total]');
  const note = root.querySelector<HTMLElement>('[data-note]');
  const daysOut = root.querySelector('[data-days-out]');

  let card = config.initial;
  const money = (value: number) => `${card.currency_symbol}${Math.round(value).toLocaleString('en-IN')}`;

  const chosen = () =>
    new Set([...form.querySelectorAll<HTMLInputElement>('input[name="placement"]:checked')].map((input) => input.value));

  /** The phone: a ticked placement stops looking like an empty slot. AUTO
   * means every one of them, which is exactly what it buys. */
  const paintPreview = (picked: Set<string>) => {
    const all = picked.has('AUTO');
    for (const zone of root.querySelectorAll<HTMLElement>('[data-zone]')) {
      zone.classList.toggle('is-live', all || picked.has(zone.dataset.zone ?? ''));
    }
  };

  const paint = () => {
    const days = Number(daysInput.value) || card.min_days;
    if (daysOut) daysOut.textContent = days === 1 ? copy.dayOne : `${days} ${copy.daysMany}`;
    const picked = chosen();
    paintPreview(picked);
    const lines = card.entries.filter((entry) => picked.has(entry.position));
    // Nothing ticked is not zero rupees — it is no campaign, and a confident
    // ₹0 would read as "this is free".
    if (lines.length === 0) {
      if (rows) rows.innerHTML = '';
      if (total) total.textContent = '—';
      setCalculatorNote(note, card.entries.length === 0 ? copy.failedNote : copy.emptyNote, true);
      return;
    }
    if (rows) rows.innerHTML = lines.map((entry) => priceRow(entry, days, money, copy.perDaySuffix)).join('');
    if (total) total.textContent = money(lines.reduce((sum, entry) => sum + entry.price_per_day * days, 0));
    setCalculatorNote(note, copy.note, false);
  };

  /** Fill the rate table when this build shipped it empty. One fetch serves
   * both sections — the contract is the `data-rate-empty` marker. */
  const fillRateTable = () => {
    const body = document.querySelector('[data-rate-rows][data-rate-empty]');
    if (!body) return;
    const notes = placementNotes();
    body.innerHTML = card.entries.map((entry) => rateRow(entry, notes, money)).join('');
    body.removeAttribute('data-rate-empty');
  };

  /** Rebuild the chips from the live card, keeping whatever was ticked. A
   * build that could not reach the API ships none, so this is also the only
   * thing that can put them on the page at all. */
  const renderChips = () => {
    if (!chipBox) return;
    const keep = chosen();
    const isOn = (position: string) => (keep.size > 0 ? keep.has(position) : position === config.defaultPick);
    chipBox.innerHTML = card.entries
      .map((entry) => placementChip(entry, isOn(entry.position), money, copy.perDaySuffix))
      .join('');
  };

  const applyCard = (live: RateCard) => {
    card = live;
    daysInput.min = String(live.min_days);
    daysInput.max = String(live.max_days);
    // A window Marketing narrowed since this page was built can leave the
    // slider sitting outside it — quoting a campaign length nobody sells.
    const days = Number(daysInput.value);
    daysInput.value = String(Math.min(Math.max(days, live.min_days), live.max_days));
    renderChips();
    fillRateTable();
    paint();
  };

  const refresh = async () => {
    try {
      const json = await postGraphql<{ publicAdRateCard?: RateCard | null }>(root.dataset.graphqlUrl ?? '', RATE_CARD);
      const live = json?.data?.publicAdRateCard;
      if (!live?.entries?.length) throw new Error('no rate card');
      applyCard(live);
    } catch {
      // Whatever the build baked in is still on screen and still real — it is
      // only as old as the last deploy. Only a page with nothing at all to
      // show has to say so.
      if (card.entries.length === 0) paint();
    }
  };

  form.addEventListener('input', paint);
  form.addEventListener('change', paint);
  paint();
  detach(refresh(), 'campaign-calculator');
}
