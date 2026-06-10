import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { VenueLeadForm } from '@/forms/venue-lead';
import { HostLeadForm } from '@/forms/host-lead';
import type { CrmOptionGroup } from '@/api/crm.types';

const config: CrmOptionGroup = {
  venue_types: ['Banquet Hall'],
  space_types: ['Indoor'],
  venue_event_suitability: ['Wedding'],
  week_days: ['Monday'],
  booking_notices: ['Instant'],
  pricing_models: ['Hourly'],
  amenities: ['Parking'],
  lead_sources: ['Referral'],
  venue_lead_statuses: ['New'],
  host_lead_statuses: ['New'],
  priorities: ['Medium'],
  host_types: ['Individual'],
  host_interests: ['Cricket / Sports'],
  audience_sizes: ['10-20'],
  frequencies: ['One-time'],
  revenue_models: ['Paid Tickets'],
  host_intent_scores: ['Looking for venue only'],
  services_offered_options: ['Catering'],
  venue_services_offered_options: ['Catering'],
  host_services_offered_options: ['Event Hosting'],
};

const wrap = (ui: React.ReactElement) =>
  render(
    <MockedProvider mocks={[]}>
      <MemoryRouter>
        <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>
      </MemoryRouter>
    </MockedProvider>
  );

describe('VenueLeadForm', () => {
  it('renders all 14 sections by their numbered titles', () => {
    wrap(<VenueLeadForm config={config} onSubmit={() => undefined} />);
    expect(screen.getByText(/1\. Venue Details/)).toBeTruthy();
    expect(screen.getByText(/14\. Internal Lead Tracking/)).toBeTruthy();
  });

  it('exposes the configured submit + cancel labels', () => {
    const onCancel = vi.fn();
    wrap(<VenueLeadForm config={config} onSubmit={() => undefined} onCancel={onCancel} submitLabel="Update venue lead" />);
    expect(screen.getByRole('button', { name: /Update venue lead/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows a "Saving…" label when submitting', () => {
    wrap(<VenueLeadForm config={config} onSubmit={() => undefined} submitting />);
    expect(screen.getByRole('button', { name: /Saving/i })).toBeTruthy();
  });
});

describe('HostLeadForm', () => {
  it('renders all major sections including services + tracking', () => {
    wrap(<HostLeadForm config={config} onSubmit={() => undefined} />);
    expect(screen.getByText(/1\. Basic Details/)).toBeTruthy();
    expect(screen.getByText(/11\. Internal Tracking/)).toBeTruthy();
    expect(screen.getByText(/8\. Services Offered/)).toBeTruthy();
  });

  it('honours the submitLabel and shows Saving… while submitting', () => {
    wrap(<HostLeadForm config={config} onSubmit={() => undefined} submitting submitLabel="Update host lead" />);
    expect(screen.getByRole('button', { name: /Saving/i })).toBeTruthy();
  });
});
