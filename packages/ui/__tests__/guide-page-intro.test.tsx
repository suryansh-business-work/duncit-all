import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PageIntro } from '../src/guide/PageIntro';

const STEPS = ['Pick a payout cycle', 'Review every line against attendance', 'Release, or hold a line with a note'];

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The element the toggle says it controls. */
function controlled(toggle: HTMLElement): HTMLElement | null {
  return document.getElementById(String(toggle.getAttribute('aria-controls')));
}

describe('PageIntro', () => {
  it('opens the steps on a first visit: a numbered list under "How this works", owned by the toggle', () => {
    render(<PageIntro id="finance-payouts" summary="Release host and venue payouts for completed pods." steps={STEPS} />);
    expect(screen.getByText('Release host and venue payouts for completed pods.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How this works' })).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Hide steps' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const region = controlled(toggle);
    expect(region).not.toHaveClass('MuiCollapse-hidden');

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(region).toContainElement(list);
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(STEPS);
    expect(screen.queryByRole('button', { name: 'Start tour' })).not.toBeInTheDocument();
  });

  it('remembers folded steps for the page and restores them on the next visit', async () => {
    const { unmount } = render(<PageIntro id="finance-payouts" summary="Payouts." steps={STEPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide steps' }));
    const folded = screen.getByRole('button', { name: 'Show steps' });
    expect(folded).toHaveAttribute('aria-expanded', 'false');
    // The Collapse finishes its exit on a timer before it hides the list.
    await waitFor(() => expect(controlled(folded)).toHaveClass('MuiCollapse-hidden'));
    expect(localStorage.getItem('duncit.guide.finance-payouts')).toBe('0');
    unmount();

    render(<PageIntro id="finance-payouts" summary="Payouts." steps={STEPS} />);
    const restored = screen.getByRole('button', { name: 'Show steps' });
    expect(restored).toHaveAttribute('aria-expanded', 'false');
    // Mounted folded: hidden from the first frame, no transition to wait for.
    expect(controlled(restored)).toHaveClass('MuiCollapse-hidden');
    fireEvent.click(restored);
    expect(screen.getByRole('button', { name: 'Hide steps' })).toHaveAttribute('aria-expanded', 'true');
    expect(localStorage.getItem('duncit.guide.finance-payouts')).toBe('1');
  });

  it('keeps one page from folding another: the key is per id unless a storageKey is given', () => {
    localStorage.setItem('duncit.guide.finance-payouts', '0');
    render(<PageIntro id="crm-leads" summary="Leads." steps={STEPS} storageKey="crm.leads.intro" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide steps' }));
    expect(localStorage.getItem('crm.leads.intro')).toBe('0');
    expect(localStorage.getItem('duncit.guide.crm-leads')).toBeNull();
  });

  it('offers Start tour on its own, with no steps section', () => {
    const onStartTour = vi.fn();
    render(<PageIntro id="crm-leads" summary="Leads." onStartTour={onStartTour} />);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(onStartTour).toHaveBeenCalledTimes(1);
  });

  it('shows steps and the tour button side by side', () => {
    render(<PageIntro id="crm-leads" summary="Leads." steps={STEPS} onStartTour={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Hide steps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start tour' })).toBeInTheDocument();
  });

  it('is just the summary when there is nothing else to say', () => {
    render(<PageIntro id="crm-leads" summary="Leads." steps={[]} sx={{ mt: 1 }} />);
    expect(screen.getByText('Leads.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-intro')).toHaveStyle({ marginTop: '8px' });
  });

  it('works with storage blocked: opens as a first visit, folds for this visit only, never throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<PageIntro id="finance-payouts" summary="Payouts." steps={STEPS} />);
    const toggle = screen.getByRole('button', { name: 'Hide steps' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show steps' })).toHaveAttribute('aria-expanded', 'false');
  });
});
