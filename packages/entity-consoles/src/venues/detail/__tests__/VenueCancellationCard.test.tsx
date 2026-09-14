import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueCancellationCard from '../VenueCancellationCard';
import type { VenueSettings } from '../queries';
import { missing, venueSettings } from './fixtures';

type Cancellation = VenueSettings['cancellation'];

const renderPolicy = (cancellation: Cancellation) =>
  render(<VenueCancellationCard settings={venueSettings({ cancellation })} />);

const base = venueSettings().cancellation;

describe('VenueCancellationCard', () => {
  it('reads each band as a sentence — a percentage of the slot price or a flat amount', () => {
    renderPolicy(base);

    expect(screen.getByText('Cancellation policy')).toBeInTheDocument();
    expect(screen.getByText('Within 24h — 50% of the slot price')).toBeInTheDocument();
    expect(screen.getByText('Within 6h — 1500')).toBeInTheDocument();
  });

  it('says the venue only reschedules, and hides the bands, when reschedule-only is on', () => {
    renderPolicy({ ...base, reschedule_only: true });

    expect(screen.getByText('Reschedule only — no cancellations')).toBeInTheDocument();
    expect(screen.queryByText('Within 24h — 50% of the slot price')).not.toBeInTheDocument();
  });

  it('says there are no bands for an empty band list', () => {
    renderPolicy({ ...base, tiers: [] });

    expect(screen.getByText('No charges yet — cancelling is free at any time.')).toBeInTheDocument();
  });

  it('treats a policy that was never saved, or saved without bands, as having none', () => {
    const { unmount } = renderPolicy(missing<Cancellation>());
    expect(screen.getByText('No charges yet — cancelling is free at any time.')).toBeInTheDocument();
    unmount();

    renderPolicy({ ...base, tiers: missing<Cancellation['tiers']>() });
    expect(screen.getByText('No charges yet — cancelling is free at any time.')).toBeInTheDocument();
  });
});
