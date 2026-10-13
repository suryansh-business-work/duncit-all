// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createEarnView } from '../../src/widgets/earnings-calculator-view';
import { earnConfig, earnCopy, earnMarkup, waterfall } from './earnings-fixtures';

const [host, clubAdmin] = earnConfig.roles;

function setup(opts: { panel?: boolean } = {}) {
  document.body.innerHTML = earnMarkup({ panel: opts.panel });
  const root = document.getElementById('r') as HTMLElement;
  const form = root.querySelector('form') as HTMLFormElement;
  return { root, form, view: createEarnView(root, form, earnConfig, earnCopy) };
}

const q = (sel: string) => document.querySelector(sel) as HTMLElement;
const rowTexts = () =>
  [...document.querySelectorAll('[data-earn-rows] > div')].map((row) => [
    row.querySelector('dt')?.textContent,
    row.querySelector('dd')?.textContent,
  ]);

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('paint', () => {
  it('draws the host rows in paise precision with deductions marked', () => {
    const { view } = setup();
    view.paint(host, waterfall);
    expect(rowTexts()).toEqual([
      ['Ticket revenue', '₹1,000.00'],
      ['GST', '− ₹180.00'],
      ['Platform fee', '− ₹100.00'],
      ['Venue', '− ₹300.00'],
      ['Host commission', '− ₹120.00'],
      ['Per pod', '₹250.50'],
    ]);
    expect(q('[data-earn-label]').textContent).toBe('Host take-home');
    expect(q('[data-earn-takehome]').textContent).toBe('₹250.50');
    expect(q('[data-earn-takehome]').className).toContain('text-ink');
    expect(q('[data-earn-note]').textContent).toBe('Standard note');
  });

  it('shows a zero deduction without a minus sign', () => {
    const { view } = setup();
    view.paint(host, { ...waterfall, gst_amount: 0 });
    expect(rowTexts()[1]).toEqual(['GST', '₹0.00']);
  });

  it('multiplies money lines by the multiplier slider but leaves the pod count alone', () => {
    const { view } = setup();
    view.paint(clubAdmin, waterfall);
    expect(rowTexts()).toEqual([
      ['Ticket revenue', '₹4,000.00'],
      ['Club admin share', '− ₹200.00'],
      ['Pods', '× 4'],
    ]);
    expect(q('[data-earn-takehome]').textContent).toBe('₹200.00');
  });

  it('shows a dash and the no-share note when the role rate is zero', () => {
    const { view } = setup();
    view.paint(host, { ...waterfall, host_commission_amount: 0 });
    expect(q('[data-earn-takehome]').textContent).toBe('—');
    expect(q('[data-earn-takehome]').className).toContain('text-ink-soft');
    expect(q('[data-earn-note]').textContent).toBe('No share note');
    expect(q('[data-earn-note]').className).toContain('font-semibold');
  });

  it('reports a shortfall rather than clamping it', () => {
    const { view } = setup();
    view.paint(host, { ...waterfall, host_receives: -40.25 });
    expect(q('[data-earn-takehome]').textContent).toBe('₹-40.25');
    expect(q('[data-earn-takehome]').className).toContain('text-primary-dark');
    expect(q('[data-earn-note]').textContent).toBe('Shortfall note');
  });

  it('treats exactly zero as a shortfall', () => {
    const { view } = setup();
    view.paint(host, { ...waterfall, host_receives: 0 });
    expect(q('[data-earn-note]').textContent).toBe('Shortfall note');
  });

  it('does not fail when the panel elements are missing', () => {
    const { view } = setup({ panel: false });
    expect(() => view.paint(host, waterfall)).not.toThrow();
    expect(() => view.paint(host, { ...waterfall, host_commission_amount: 0 })).not.toThrow();
    expect(() => view.paintRole(host)).not.toThrow();
    expect(() => view.showUnavailable('x')).not.toThrow();
    expect(view.note).toBeNull();
    expect(view.snapshot(host, waterfall).takeHome).toBe('');
  });
});

describe('paintRole', () => {
  it('writes the duties and hides the sliders that belong to other roles', () => {
    const { view } = setup();
    view.paintRole(host);
    expect(q('[data-duties-title]').textContent).toBe('Host duties');
    expect(document.querySelectorAll('[data-duties] li')).toHaveLength(2);
    const fields = document.querySelectorAll<HTMLElement>('[data-field]');
    expect([...fields].map((f) => f.hidden)).toEqual([false, false, false, true, false]);
    view.paintRole(clubAdmin);
    expect([...fields].map((f) => f.hidden)).toEqual([false, false, false, false, false]);
    expect(q('[data-duties-title]').textContent).toBe('Club duties');
  });
});

describe('syncLabels', () => {
  it('writes each slider value with its prefix and Indian grouping', () => {
    const { view, form } = setup();
    (form.querySelector('[name=ticket]') as HTMLInputElement).value = '1500';
    view.syncLabels();
    expect(q('[data-out="ticket"]').textContent).toBe('₹1,500');
    expect(q('[data-out="spots"]').textContent).toBe('10');
  });

  it('skips a slider without an output element', () => {
    const { view, root } = setup();
    root.querySelector('[data-out="spots"]')?.remove();
    expect(() => view.syncLabels()).not.toThrow();
  });
});

describe('showUnavailable and snapshot', () => {
  it('shows a dash and the message as a warning', () => {
    const { view } = setup();
    view.showUnavailable('Could not load');
    expect(q('[data-earn-takehome]').textContent).toBe('—');
    expect(q('[data-earn-note]').textContent).toBe('Could not load');
  });

  it('snapshots the panel, slider values and row text for the PDF', () => {
    const { view } = setup();
    view.paint(host, waterfall);
    const snap = view.snapshot(host, waterfall);
    expect(snap.takeHome).toBe('₹250.50');
    expect(snap.role).toBe(host);
    expect(snap.sliderValue('spots')).toBe(10);
    expect(snap.sliderValue('missing')).toBe(0);
    expect(snap.rowText('gst')).toBe('− ₹180.00');
    expect(snap.rowLabels).toBe(earnConfig.rowLabels);
  });
});
