// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../src/widgets/campaign-calculator';
import { flush, stubFetch, stubFetchReject } from './helpers';

const copy = {
  perDaySuffix: '/day',
  note: 'Standard note',
  emptyNote: 'Pick a placement',
  failedNote: 'Rates unavailable',
  dayOne: '1 day',
  daysMany: 'days',
};

const entries = [
  { position: 'HOME', label: 'Home', price_per_day: 100, note: null },
  { position: 'FEED', label: 'Feed', price_per_day: 250.4, note: 'Feed note' },
];
const card = { currency_symbol: '₹', min_days: 1, max_days: 30, entries };

interface Opts {
  initial?: unknown;
  defaultPick?: string;
  checked?: string[];
  days?: number;
  withOutputs?: boolean;
  rateTable?: boolean;
}

function build(opts: Opts = {}): HTMLElement {
  const { initial = card, defaultPick = 'HOME', checked = ['HOME'], days = 7, withOutputs = true, rateTable = false } = opts;
  const config = JSON.stringify({ initial, defaultPick });
  const chips = checked
    .map((p) => `<label><input type="checkbox" name="placement" value="${p}" checked/></label>`)
    .join('');
  document.body.innerHTML = `
    ${rateTable ? '<table><tbody data-rate-rows data-rate-empty></tbody></table><script type="application/json" data-placement-notes>{"HOME":"Bundled home"}</script>' : ''}
    <section id="r" data-graphql-url="https://api.test/gql" data-config='${config}' data-copy='${JSON.stringify(copy)}'>
      <form data-ads-form>
        <div data-placements>${chips}</div>
        <input type="range" name="days" min="1" max="30" value="${days}"/>
      </form>
      ${
        withOutputs
          ? '<span data-days-out></span><span data-total></span><dl data-rows></dl><p data-note></p>'
          : ''
      }
      <i data-zone="HOME"></i><i data-zone="FEED"></i><i data-zone></i>
    </section>`;
  return document.getElementById('r') as HTMLElement;
}

const q = (sel: string) => document.querySelector(sel) as HTMLElement;
const days = () => q('input[name=days]') as HTMLInputElement;

afterEach(() => vi.unstubAllGlobals());

describe('campaign-calculator mount', () => {
  it('prices the ticked placement over the chosen days from the baked card', async () => {
    const root = build();
    stubFetchReject();
    mount(root);
    expect(q('[data-days-out]').textContent).toBe('7 days');
    expect(q('[data-total]').textContent).toBe('₹700');
    expect(q('[data-rows]').textContent).toContain('Home · ₹100/day');
    expect(q('[data-note]').textContent).toBe('Standard note');
    expect(q('[data-note]').className).toContain('text-ink-soft');
    await flush();
    expect(q('[data-total]').textContent).toBe('₹700');
  });

  it('uses the singular label for one day', () => {
    const root = build({ days: 1 });
    stubFetchReject();
    mount(root);
    expect(q('[data-days-out]').textContent).toBe('1 day');
  });

  it('falls back to the minimum days when the slider has no number', () => {
    const root = build();
    days().min = '0';
    days().value = '0';
    stubFetchReject();
    mount(root);
    expect(q('[data-days-out]').textContent).toBe('1 day');
    expect(q('[data-total]').textContent).toBe('₹100');
  });

  it('rounds each total to whole currency units and adds placements together', () => {
    const root = build({ checked: ['HOME', 'FEED'], days: 2 });
    stubFetchReject();
    mount(root);
    expect(q('[data-total]').textContent).toBe('₹701');
  });

  it('lights the phone zones of the ticked placements only', () => {
    const root = build({ checked: ['FEED'] });
    stubFetchReject();
    mount(root);
    const zones = document.querySelectorAll('[data-zone]');
    expect(zones[0].classList.contains('is-live')).toBe(false);
    expect(zones[1].classList.contains('is-live')).toBe(true);
    expect(zones[2].classList.contains('is-live')).toBe(false);
  });

  it('lights every zone for AUTO', () => {
    const root = build({ checked: ['AUTO'] });
    stubFetchReject();
    mount(root);
    for (const zone of document.querySelectorAll('[data-zone]')) {
      expect(zone.classList.contains('is-live')).toBe(true);
    }
  });

  it('shows a dash and the empty note when nothing is ticked', () => {
    const root = build({ checked: [] });
    stubFetchReject();
    mount(root);
    expect(q('[data-total]').textContent).toBe('—');
    expect(q('[data-rows]').innerHTML).toBe('');
    expect(q('[data-note]').textContent).toBe('Pick a placement');
    expect(q('[data-note]').className).toContain('font-semibold');
  });

  it('reprices when the days slider or a chip changes', () => {
    const root = build();
    stubFetchReject();
    mount(root);
    days().value = '10';
    days().dispatchEvent(new Event('input', { bubbles: true }));
    expect(q('[data-total]').textContent).toBe('₹1,000');
    (q('input[name=placement]') as HTMLInputElement).checked = false;
    q('form').dispatchEvent(new Event('change', { bubbles: true }));
    expect(q('[data-total]').textContent).toBe('—');
  });

  it('applies the live card: limits, clamped days, rebuilt chips keeping the ticks', async () => {
    const root = build({ checked: ['FEED'], days: 25 });
    stubFetch({
      data: {
        publicAdRateCard: {
          currency_symbol: '$',
          min_days: 2,
          max_days: 10,
          entries: [
            { position: 'HOME', label: 'Home', price_per_day: 10 },
            { position: 'FEED', label: 'Feed', price_per_day: 20 },
          ],
        },
      },
    });
    mount(root);
    await flush();
    expect(days().min).toBe('2');
    expect(days().max).toBe('10');
    expect(days().value).toBe('10');
    const chips = document.querySelectorAll<HTMLInputElement>('input[name=placement]');
    expect([...chips].map((c) => [c.value, c.checked])).toEqual([
      ['HOME', false],
      ['FEED', true],
    ]);
    expect(q('[data-total]').textContent).toBe('$200');
  });

  it('clamps a too-small day count up to the live minimum', async () => {
    const root = build({ days: 1 });
    stubFetch({ data: { publicAdRateCard: { ...card, min_days: 5, max_days: 9 } } });
    mount(root);
    await flush();
    expect(days().value).toBe('5');
  });

  it('ticks the default placement when nothing was ticked before the live card', async () => {
    const root = build({ checked: [], defaultPick: 'FEED' });
    stubFetch({ data: { publicAdRateCard: card } });
    mount(root);
    await flush();
    const ticked = [...document.querySelectorAll<HTMLInputElement>('input[name=placement]')].filter((c) => c.checked);
    expect(ticked.map((c) => c.value)).toEqual(['FEED']);
  });

  it('fills the empty rate table once, from the same fetch, with bundled notes', async () => {
    const root = build({ rateTable: true });
    stubFetch({ data: { publicAdRateCard: card } });
    mount(root);
    await flush();
    const body = q('[data-rate-rows]');
    expect(body.hasAttribute('data-rate-empty')).toBe(false);
    expect(body.querySelectorAll('tr')).toHaveLength(2);
    expect(body.textContent).toContain('Bundled home');
    expect(body.textContent).toContain('Feed note');
  });

  it('keeps the baked card when the fetch fails', async () => {
    const root = build();
    stubFetchReject();
    mount(root);
    await flush();
    expect(q('[data-total]').textContent).toBe('₹700');
  });

  it('keeps the baked card when the live card has no entries', async () => {
    const root = build();
    stubFetch({ data: { publicAdRateCard: { ...card, entries: [] } } });
    mount(root);
    await flush();
    expect(q('[data-total]').textContent).toBe('₹700');
    expect(days().max).toBe('30');
  });

  it('keeps the baked card when the response has no data', async () => {
    const root = build();
    stubFetch(null);
    mount(root);
    await flush();
    expect(q('[data-total]').textContent).toBe('₹700');
  });

  it('says rates are unavailable when the build had none and the fetch fails', async () => {
    const root = build({ initial: { currency_symbol: '₹', min_days: 1, max_days: 30, entries: [] }, checked: [] });
    stubFetchReject();
    mount(root);
    await flush();
    expect(q('[data-note]').textContent).toBe('Rates unavailable');
    expect(q('[data-total]').textContent).toBe('—');
  });

  it('works without any output elements and without a chip box', async () => {
    const root = build({ withOutputs: false });
    q('[data-placements]').removeAttribute('data-placements');
    stubFetch({ data: { publicAdRateCard: card } });
    mount(root);
    await flush();
    expect(days().max).toBe('30');
  });

  it('skips the rate table fill when the page has none', async () => {
    const root = build();
    stubFetch({ data: { publicAdRateCard: card } });
    mount(root);
    await flush();
    expect(document.querySelector('[data-rate-rows]')).toBeNull();
  });

  it('does nothing without the form or days input, or on a second mount', async () => {
    document.body.innerHTML = '<section id="r"></section>';
    const bare = document.getElementById('r') as HTMLElement;
    mount(bare);
    expect(bare.dataset.cmsMounted).toBeUndefined();

    document.body.innerHTML = '<section id="r"><form data-ads-form></form></section>';
    const noDays = document.getElementById('r') as HTMLElement;
    mount(noDays);
    expect(noDays.dataset.cmsMounted).toBeUndefined();

    const root = build();
    const fetchMock = stubFetch({ data: { publicAdRateCard: card } });
    mount(root);
    mount(root);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tolerates a missing url attribute and a zone without a name', () => {
    const root = build();
    root.removeAttribute('data-graphql-url');
    const fetchMock = stubFetch({ data: {} });
    mount(root);
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });
});
