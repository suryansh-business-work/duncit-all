// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  placementChip,
  placementNotes,
  priceRow,
  rateRow,
  type RateEntry,
} from '../../src/widgets/campaign-calculator-markup';

const money = (value: number) => `Rs${value}`;
const entry: RateEntry = { position: 'HOME', label: 'Home banner', price_per_day: 150, note: null };

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('priceRow', () => {
  it('shows the label with its day rate and the rate over the days', () => {
    const html = priceRow(entry, 3, money, '/day');
    expect(html).toContain('Home banner · Rs150/day');
    expect(html).toContain('>Rs450<');
  });
});

describe('placementChip', () => {
  it('renders a ticked checkbox for an on chip', () => {
    const html = placementChip(entry, true, money, '/d');
    expect(html).toContain('value="HOME" checked');
    expect(html).toContain('Rs150/d');
  });
  it('renders an unticked checkbox for an off chip', () => {
    expect(placementChip(entry, false, money, '/d')).not.toContain('checked');
  });
});

describe('rateRow', () => {
  it('uses the live note when there is one', () => {
    const html = rateRow({ ...entry, note: 'Live note' }, { HOME: 'Bundled' }, money);
    expect(html).toContain('Live note');
    expect(html).not.toContain('Bundled');
  });
  it('falls back to the bundled description for the position', () => {
    expect(rateRow(entry, { HOME: 'Bundled' }, money)).toContain('Bundled');
  });
  it('renders an empty description when neither exists', () => {
    expect(rateRow(entry, {}, money)).toContain('sm:table-cell"></td>');
  });
});

describe('placementNotes', () => {
  it('parses the bundled JSON blob', () => {
    document.body.innerHTML = '<script type="application/json" data-placement-notes>{"HOME":"Top of home"}</script>';
    expect(placementNotes()).toEqual({ HOME: 'Top of home' });
  });
  it('returns an empty map when the blob is absent', () => {
    expect(placementNotes()).toEqual({});
  });
  it('returns an empty map for a malformed blob instead of throwing', () => {
    document.body.innerHTML = '<script type="application/json" data-placement-notes>{oops</script>';
    expect(placementNotes()).toEqual({});
  });
});
