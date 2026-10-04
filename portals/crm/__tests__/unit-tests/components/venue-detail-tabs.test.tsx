import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '@duncit/app-settings';
import VenueOverviewTab from '@/pages/venue-leads/VenueLeadDetailPage/VenueOverviewTab';
import VenueLinkedHostsTab from '@/pages/venue-leads/VenueLeadDetailPage/VenueLinkedHostsTab';
import type { VenueLead } from '@/api/crm.types';
import { venueLead } from '../fixtures/leads';

function Overview({ lead }: Readonly<{ lead: VenueLead }>) {
  const { t } = useTranslation();
  return <VenueOverviewTab lead={lead} t={t} followUpLabel="25 Sep 2026" />;
}

function LinkedHosts({ lead, navigate }: Readonly<{ lead: VenueLead; navigate: ReturnType<typeof vi.fn> }>) {
  const { t } = useTranslation();
  return <VenueLinkedHostsTab lead={lead} t={t} navigate={navigate} />;
}

/** The value printed next to a LeadDetailRow label. */
const rowValue = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('VenueOverviewTab', () => {
  it('shows every captured detail of a filled lead', () => {
    render(<Overview lead={venueLead({ remarks: 'Prefers weekday calls\nOwner travels often' })} />);

    expect(rowValue('Super category')).toBe('Events');
    expect(rowValue('Types')).toBe('Banquet');
    expect(rowValue('Space')).toBe('Indoor');
    expect(rowValue('Capacity')).toBe('50 – 300');
    expect(rowValue('Description')).toBe('A 300-seat banquet hall');
    expect(rowValue('City')).toBe('Pune');
    expect(rowValue('Area')).toBe('Baner');
    expect(rowValue('Address')).toBe('12 Baner Road, Pune');
    expect(rowValue('Landmark')).toBe('Near Balewadi stadium');
    expect(screen.getByTitle('Map of 12 Baner Road, Pune, Baner, Pune')).toBeInTheDocument();
    expect(rowValue('Days')).toBe('Saturday');
    expect(rowValue('Time slots')).toBe('Evenings');
    expect(rowValue('Booking notice')).toBe('1 week');
    expect(rowValue('Suitable for')).toBe('Weddings');
    expect(rowValue('Amenities')).toBe('Parking');
    expect(rowValue('Source')).toBe('Instagram');
    expect(rowValue('Assigned to')).toBe('Priya');
    expect(rowValue('Follow-up')).toBe('25 Sep 2026');
    expect(rowValue('Created')).toBe(formatDateTime('2026-09-01T10:00:00.000Z'));
    expect(rowValue('Updated')).toBe(formatDateTime('2026-09-02T10:00:00.000Z'));
    expect(screen.getByText('REMARKS')).toBeInTheDocument();
    expect(screen.getByText(/Prefers weekday calls/)).toHaveTextContent('Prefers weekday calls Owner travels often');
  });

  it('dashes every empty field and hides the remarks block for a sparse lead', () => {
    render(
      <Overview
        lead={venueLead({
          super_category: null,
          venue_types: [],
          space_type: null,
          capacity_min: null,
          capacity_max: null,
          venue_description: '',
          area: null,
          landmark: null,
          available_days: [],
          available_time_slots: null,
          booking_notice: '',
          event_suitability: [],
          amenities: [],
          lead_source: null,
          assigned_to: '',
          created_at: null,
          updated_at: null,
          remarks: null,
        })}
      />,
    );

    for (const label of [
      'Super category',
      'Types',
      'Space',
      'Capacity',
      'Description',
      'Area',
      'Landmark',
      'Days',
      'Time slots',
      'Booking notice',
      'Suitable for',
      'Amenities',
      'Source',
      'Assigned to',
      'Created',
      'Updated',
    ]) {
      expect(rowValue(label)).toBe('—');
    }
    // The map query skips the missing area rather than leaving a blank segment.
    expect(screen.getByTitle('Map of 12 Baner Road, Pune, Pune')).toBeInTheDocument();
    expect(screen.queryByText('REMARKS')).toBeNull();
  });
});

describe('VenueLinkedHostsTab', () => {
  const hosts: VenueLead['linked_hosts'] = [
    { id: 'host-1', host_name: 'Pune Runners', host_type: 'Community', city: 'Pune', lead_status: 'Qualified', priority: 'High' },
    { id: 'host-2', host_name: 'Solo Host', host_type: null, city: null, lead_status: 'New', priority: 'Low' },
    { id: 'host-3', host_name: 'City Only', host_type: null, city: 'Mumbai', lead_status: 'New', priority: 'Medium' },
  ];

  it('explains how to link hosts when none are linked', () => {
    const navigate = vi.fn();
    render(<LinkedHosts lead={venueLead({ linked_hosts: [] })} navigate={navigate} />);

    expect(screen.getByRole('heading', { name: 'Linked hosts' })).toBeInTheDocument();
    expect(screen.getByText('Host leads associated with this venue. Set from the Edit form.')).toBeInTheDocument();
    expect(screen.getByText(/No hosts linked yet/)).toBeInTheDocument();
    expect(screen.queryAllByTestId('venue-lead-linked-host')).toHaveLength(0);
  });

  it('lists each linked host with its status, priority and type/city summary', () => {
    render(<LinkedHosts lead={venueLead({ linked_hosts: hosts })} navigate={vi.fn()} />);

    const cards = screen.getAllByTestId('venue-lead-linked-host');
    expect(cards).toHaveLength(3);
    expect(screen.queryByText(/No hosts linked yet/)).toBeNull();

    const first = within(cards[0]);
    expect(first.getByText('Pune Runners')).toBeInTheDocument();
    expect(first.getByText('Qualified')).toBeInTheDocument();
    expect(first.getByText('High')).toBeInTheDocument();
    expect(first.getByText('Community · Pune')).toBeInTheDocument();

    // No type and no city falls back to a dash; one present shows on its own.
    expect(within(cards[1]).getByText('—')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Mumbai')).toBeInTheDocument();
  });

  it('opens the host lead on click, Enter and Space but ignores other keys', () => {
    const navigate = vi.fn();
    render(<LinkedHosts lead={venueLead({ linked_hosts: hosts })} navigate={navigate} />);
    const [first, second, third] = screen.getAllByTestId('venue-lead-linked-host');

    fireEvent.click(first);
    expect(navigate).toHaveBeenLastCalledWith('/host-leads/host-1/view');

    fireEvent.keyDown(second, { key: 'Enter' });
    expect(navigate).toHaveBeenLastCalledWith('/host-leads/host-2/view');

    fireEvent.keyDown(third, { key: ' ' });
    expect(navigate).toHaveBeenLastCalledWith('/host-leads/host-3/view');
    expect(navigate).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(first, { key: 'Tab' });
    expect(navigate).toHaveBeenCalledTimes(3);
  });

  it('prevents the default action of the activating key so Space does not scroll', () => {
    render(<LinkedHosts lead={venueLead({ linked_hosts: hosts })} navigate={vi.fn()} />);
    const [first] = screen.getAllByTestId('venue-lead-linked-host');

    expect(fireEvent.keyDown(first, { key: ' ' })).toBe(false);
    expect(fireEvent.keyDown(first, { key: 'a' })).toBe(true);
  });
});
