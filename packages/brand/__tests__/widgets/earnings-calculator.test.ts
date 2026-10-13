// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({
  loadJsPdf: vi.fn(),
  loadLogo: vi.fn(),
  pdfText: (v: unknown) => String(v),
}));
const pdf = vi.hoisted(() => ({ buildEstimatePdf: vi.fn() }));
vi.mock('../../src/widgets/earnings-calculator-pdf-lib', () => lib);
vi.mock('../../src/widgets/earnings-calculator-pdf', () => pdf);

import { mount } from '../../src/widgets/earnings-calculator';
import { earnCopy, earnMarkup, waterfall } from './earnings-fixtures';
import { stubFetch, stubFetchReject } from './helpers';

const estimate = { data: { publicPodEarningsEstimate: { payable_spots: 8, waterfall } } };

const q = (sel: string) => document.querySelector(sel) as HTMLElement;
const root = () => document.getElementById('r') as HTMLElement;
const input = (name: string) => document.querySelector(`input[name=${name}]`) as HTMLInputElement;
const drag = (name: string, value: string) => {
  input(name).value = value;
  input(name).dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
  vi.useFakeTimers();
  lib.loadJsPdf.mockReset();
  lib.loadLogo.mockReset();
  pdf.buildEstimatePdf.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mounted(opts: Parameters<typeof earnMarkup>[0] = {}, body: unknown = estimate) {
  document.body.innerHTML = earnMarkup(opts);
  const fetchMock = stubFetch(body);
  mount(root());
  await vi.advanceTimersByTimeAsync(0);
  return fetchMock;
}

describe('earnings-calculator request and paint', () => {
  it('asks the server for the estimate with the slider values and paints the host role', async () => {
    const fetchMock = await mounted();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/gql');
    expect(body.query).toContain('publicPodEarningsEstimate');
    expect(body.variables).toEqual({ amount: 500, spots: 10, venue: 0 });
    expect(q('[data-earn-takehome]').textContent).toBe('₹250.50');
    expect(q('[data-duties-title]').textContent).toBe('Host duties');
    expect(q('[data-out="ticket"]').textContent).toBe('₹500');
  });

  it('debounces slider drags into one request', async () => {
    const fetchMock = await mounted();
    drag('ticket', '600');
    drag('ticket', '700');
    drag('spots', '12');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(179);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).variables).toEqual({ amount: 700, spots: 12, venue: 0 });
    expect(q('[data-out="ticket"]').textContent).toBe('₹700');
  });

  it('switches role without asking the server and repaints the same figures', async () => {
    const fetchMock = await mounted();
    q('[data-role-tab="club_admin"]').click();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(q('[data-role-tab="club_admin"]').getAttribute('aria-selected')).toBe('true');
    expect(q('[data-role-tab="host"]').getAttribute('aria-selected')).toBe('false');
    expect(q('[data-earn-takehome]').textContent).toBe('₹200.00');
    expect(q('[data-duties-title]').textContent).toBe('Club duties');
  });

  it('falls back to the first role for an unknown tab key', async () => {
    await mounted();
    q('[data-role-tab="club_admin"]').click();
    const hostTab = q('[data-role-tab="host"]');
    hostTab.dataset.roleTab = 'unknown';
    hostTab.click();
    expect(q('[data-earn-label]').textContent).toBe('Host take-home');
  });

  it('repaints on a multiplier drag without a new request', async () => {
    const fetchMock = await mounted();
    q('[data-role-tab="club_admin"]').click();
    drag('pods', '10');
    expect(q('[data-earn-takehome]').textContent).toBe('₹500.00');
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats the pod slider as a normal input for a role without a multiplier', async () => {
    const fetchMock = await mounted();
    drag('pods', '10');
    await vi.advanceTimersByTimeAsync(180);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ignores non-input event targets for the multiplier shortcut', async () => {
    const fetchMock = await mounted();
    q('form').dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(180);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('earnings-calculator failures', () => {
  it('says so when the first estimate cannot be loaded', async () => {
    document.body.innerHTML = earnMarkup();
    stubFetchReject();
    mount(root());
    await vi.advanceTimersByTimeAsync(0);
    expect(q('[data-earn-takehome]').textContent).toBe('—');
    expect(q('[data-earn-note]').textContent).toBe('Could not load');
  });

  it('says so when the answer carries no estimate', async () => {
    await mounted({}, { data: { publicPodEarningsEstimate: null } });
    expect(q('[data-earn-note]').textContent).toBe('Could not load');
  });

  it('says so when the body has no data at all', async () => {
    await mounted({}, null);
    expect(q('[data-earn-note]').textContent).toBe('Could not load');
  });

  it('leaves the numbers alone when a later refresh fails', async () => {
    await mounted();
    stubFetchReject();
    drag('ticket', '900');
    await vi.advanceTimersByTimeAsync(180);
    expect(q('[data-earn-takehome]').textContent).toBe('₹250.50');
    expect(q('[data-earn-note]').textContent).toBe('Standard note');
  });

  it('defaults a missing url attribute to empty', async () => {
    document.body.innerHTML = earnMarkup();
    root().removeAttribute('data-graphql-url');
    const fetchMock = stubFetch(estimate);
    mount(root());
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock.mock.calls[0][0]).toBe('');
  });
});

describe('earnings-calculator mount guards', () => {
  it('does nothing without the form', () => {
    document.body.innerHTML = '<section id="r"></section>';
    mount(root());
    expect(root().dataset.cmsMounted).toBeUndefined();
  });

  it('mounts once per root', async () => {
    const fetchMock = await mounted();
    mount(root());
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('earnings-calculator PDF button', () => {
  const save = vi.fn();

  beforeEach(() => {
    save.mockReset();
    lib.loadJsPdf.mockResolvedValue(class {});
    lib.loadLogo.mockResolvedValue({ dataUrl: 'd', w: 1, h: 1, format: 'PNG' });
    pdf.buildEstimatePdf.mockReturnValue({ save });
  });

  it('builds and saves the file from the live snapshot, then restores the button', async () => {
    await mounted();
    const button = q('[data-print-estimate]') as HTMLButtonElement;
    button.click();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Preparing…');
    await vi.advanceTimersByTimeAsync(0);
    expect(lib.loadLogo).toHaveBeenCalledWith('https://cdn.test/logo.png');
    const [, logo, snap] = pdf.buildEstimatePdf.mock.calls[0];
    expect(logo).toEqual({ dataUrl: 'd', w: 1, h: 1, format: 'PNG' });
    expect(snap.takeHome).toBe('₹250.50');
    expect(save).toHaveBeenCalledWith('estimate.pdf');
    expect(button.disabled).toBe(false);
    expect(button.innerHTML).toBe('<i>PDF</i>');
  });

  it('does nothing while there is no estimate yet', async () => {
    await mounted({}, { data: { publicPodEarningsEstimate: null } });
    q('[data-print-estimate]').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(lib.loadJsPdf).not.toHaveBeenCalled();
  });

  it('shows the PDF error and re-enables the button when drawing fails', async () => {
    await mounted();
    lib.loadJsPdf.mockRejectedValue(new Error('pdf library unavailable'));
    const button = q('[data-print-estimate]') as HTMLButtonElement;
    button.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(q('[data-earn-note]').textContent).toBe(earnCopy.pdf.error);
    expect(button.disabled).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('uses an empty logo source when the page gives none', async () => {
    await mounted({ logo: false });
    q('[data-print-estimate]').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(lib.loadLogo).toHaveBeenCalledWith('');
  });

  it('mounts fine without a PDF button', async () => {
    await mounted({ pdfButton: false });
    expect(q('[data-earn-takehome]').textContent).toBe('₹250.50');
  });
});
