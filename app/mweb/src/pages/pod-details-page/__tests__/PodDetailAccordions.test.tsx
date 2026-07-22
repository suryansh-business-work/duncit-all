import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PodDetailAccordions from '../PodDetailAccordions';

const basePod = {
  pod_description: 'A great pod',
  pod_info: 'Some info',
  what_this_pod_offers: ['Snacks', 'Music'],
  available_perks: ['Free drink'],
  place_charges: [],
  payment_terms: '',
  pod_amount: 200,
  pod_attendees: ['a1'],
  pod_hosts_id: ['h1'],
  no_of_spots: 10,
  pod_date_time: new Date(Date.now() + 86400000).toISOString(),
};

const baseProps = {
  pod: basePod,
  club: { club_name: 'Club X', club_slug: 'club-x' },
  hosts: [{ _id: 'h1', name: 'Host One' }],
  attendees: [{ _id: 'a1', name: 'Attendee One' }],
  isFree: false,
  priceCompute: (amt: number) => ({
    subtotal: amt,
    fee: 0,
    feePct: 0,
    gst: amt * 0.18,
    gstPct: 18,
    total: amt * 1.18,
    currency: '₹',
  }),
  categoryCrumbs: ['Music', 'Live'] as readonly string[],
};

const renderAccordions = (overrides: Partial<typeof baseProps> = {}) =>
  render(
    <MemoryRouter>
      <PodDetailAccordions {...baseProps} {...overrides} />
    </MemoryRouter>
  );

describe('PodDetailAccordions', () => {
  it('renders the core sections and expand/collapse controls', () => {
    renderAccordions();
    expect(screen.getByText('About this pod')).toBeInTheDocument();
    expect(screen.getByText('Club details')).toBeInTheDocument();
    expect(screen.getByText('What this pod offers')).toBeInTheDocument();
    expect(screen.getByText('Hosts')).toBeInTheDocument();
    expect(screen.getByText('Attendees')).toBeInTheDocument();
    expect(screen.getByText('Available perks')).toBeInTheDocument();
    expect(screen.getByText('Payment details')).toBeInTheDocument();

    const expandAll = screen.getByRole('button', { name: /expand all sections/i });
    const collapseAll = screen.getByRole('button', { name: /collapse all sections/i });
    // Initial state: only "about" expanded -> expand-all enabled, collapse-all enabled
    expect(expandAll).not.toBeDisabled();
    expect(collapseAll).not.toBeDisabled();
  });

  it('does not render optional terms/charges sections when absent', () => {
    renderAccordions();
    expect(screen.queryByText('Payment terms')).not.toBeInTheDocument();
    expect(screen.queryByText('Place charges')).not.toBeInTheDocument();
  });

  it('renders payment terms and place charges when present', () => {
    renderAccordions({
      pod: {
        ...basePod,
        payment_terms: '  Pay in full before start  ',
        place_charges: [{ label: 'Corkage', amount: 50 }] as any,
      },
    });
    expect(screen.getByText('Payment terms')).toBeInTheDocument();
    expect(screen.getByText('Pay in full before start')).toBeInTheDocument();
    expect(screen.getByText('Place charges')).toBeInTheDocument();
  });

  it('expands all sections then disables the Expand all button', () => {
    renderAccordions();
    const expandAll = screen.getByRole('button', { name: /expand all sections/i });
    fireEvent.click(expandAll);
    expect(expandAll).toBeDisabled();
  });

  it('collapses all sections then disables the Collapse all button', () => {
    renderAccordions();
    const collapseAll = screen.getByRole('button', { name: /collapse all sections/i });
    fireEvent.click(collapseAll);
    expect(collapseAll).toBeDisabled();
  });

  it('toggles an individual section via its accordion header', () => {
    renderAccordions();
    const expandAll = screen.getByRole('button', { name: /expand all sections/i });
    // Collapse everything first so nothing is expanded.
    fireEvent.click(screen.getByRole('button', { name: /collapse all sections/i }));
    // Click a section header to open it -> Expand all becomes enabled again.
    fireEvent.click(screen.getByText('Hosts'));
    expect(expandAll).not.toBeDisabled();
    // Click again to close it.
    fireEvent.click(screen.getByText('Hosts'));
    expect(expandAll).not.toBeDisabled();
  });

  it('handles missing optional pod fields with defaults', () => {
    renderAccordions({
      pod: {
        pod_description: 'desc',
        pod_info: 'info',
        pod_amount: 'not-a-number' as any,
        pod_date_time: null as any,
      } as any,
      isFree: true,
    });
    expect(screen.getByText('Payment details')).toBeInTheDocument();
    expect(screen.getByText('What this pod offers')).toBeInTheDocument();
  });
});
