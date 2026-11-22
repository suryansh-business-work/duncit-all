// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Venue Kit page composes three parts with their own specs; here they are
 * stand-ins, and what is checked is the page's own job: the counts, and that a
 * new registration or a status change refreshes both the list and the counts.
 */
const mocks = vi.hoisted(() => ({
  summary: { data: undefined as unknown, refetch: vi.fn() },
  registered: null as null | (() => void),
  changed: null as null | (() => void),
  tableRefetch: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({ useQuery: () => mocks.summary }));
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  logs: { portal: { venues: { error: mocks.logError } } },
}));
vi.mock('../../../src/pages/venue-kit/VenueKitPlanCard', () => ({ default: () => <div data-testid="plan-card" /> }));
vi.mock('../../../src/pages/venue-kit/interest-form', () => ({
  useVenueKitOtp: (onRegistered: () => void) => {
    mocks.registered = onRegistered;
    return { state: {}, actions: {} };
  },
  VenueKitInterestForm: () => <div data-testid="interest-form" />,
}));
vi.mock('../../../src/pages/venue-kit/VenueKitInterestsTable', () => ({
  INTEREST_STATUSES: ['NEW', 'CONTACTED', 'CONVERTED', 'NOT_INTERESTED'],
  default: ({ refetchRef, onChanged }: { refetchRef: { current: (() => void) | null }; onChanged: () => void }) => {
    refetchRef.current = mocks.tableRefetch;
    mocks.changed = onChanged;
    return <div data-testid="interests-table" />;
  },
}));

import VenueKitPage from '../../../src/pages/venue-kit';

const SUMMARY = {
  total: 5,
  phone_verified: 2,
  by_status: [
    { status: 'NEW', count: 3 },
    { status: 'CONTACTED', count: 1 },
    { status: 'CONVERTED', count: 1 },
    { status: 'NOT_INTERESTED', count: 0 },
  ],
};

beforeEach(() => {
  mocks.summary = { data: { venueKitInterestSummary: SUMMARY }, refetch: vi.fn().mockResolvedValue({}) };
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('VenueKitPage', () => {
  it('lays out the plan, the form and the list under the console heading', () => {
    render(<VenueKitPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Venue Kit' })).toBeTruthy();
    expect(screen.getByTestId('plan-card')).toBeTruthy();
    expect(screen.getByTestId('interest-form')).toBeTruthy();
    expect(screen.getByTestId('interests-table')).toBeTruthy();
  });

  it('counts every interested venue by status and by proved mobile', () => {
    render(<VenueKitPage />);
    expect(screen.getByText('Interested: 5')).toBeTruthy();
    expect(screen.getByText('Mobile verified: 2')).toBeTruthy();
    expect(screen.getByText('New: 3')).toBeTruthy();
    expect(screen.getByText('Not interested: 0')).toBeTruthy();
  });

  it('reads zero everywhere before the counts arrive', () => {
    mocks.summary = { data: undefined, refetch: vi.fn() };
    render(<VenueKitPage />);
    expect(screen.getByText('Interested: 0')).toBeTruthy();
    expect(screen.getByText('Contacted: 0')).toBeTruthy();
  });

  it('refreshes the list and the counts after a registration or a status change', async () => {
    render(<VenueKitPage />);
    mocks.registered?.();
    mocks.changed?.();
    expect(mocks.tableRefetch).toHaveBeenCalledTimes(2);
    expect(mocks.summary.refetch).toHaveBeenCalledTimes(2);
  });

  it('logs a counts refresh that fails rather than dropping it', async () => {
    mocks.summary = { data: { venueKitInterestSummary: SUMMARY }, refetch: vi.fn().mockRejectedValue(new Error('down')) };
    render(<VenueKitPage />);
    mocks.registered?.();
    await waitFor(() => expect(mocks.logError).toHaveBeenCalledWith('venueKit', 'summary', expect.objectContaining({ reason: 'down' })));
  });
});
