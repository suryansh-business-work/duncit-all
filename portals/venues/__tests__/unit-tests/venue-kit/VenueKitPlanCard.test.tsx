// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The plan card: the offer as the website shows it, and the Super Admin's
 * editor. Apollo, the notifier and the signed-in user are stand-ins; the
 * editor dialog is its own spec (venue-kit-offer.form.cy.tsx), so here it only
 * exposes the submit it was handed.
 */
const mocks = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, error: undefined as unknown, refetch: vi.fn() },
  save: vi.fn(),
  roles: ['ALL_VENUES_ACCESS'] as string[],
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  log: { warn: vi.fn(), error: vi.fn() },
  formProps: null as null | { open: boolean; onSubmit: (input: unknown) => void; onClose: () => void },
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => mocks.query,
  useMutation: () => [mocks.save, { loading: false }],
}));
vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: { roles: mocks.roles } }) }));
vi.mock('@duncit/dialogs', () => ({ notifyError: mocks.notifyError, notifySuccess: mocks.notifySuccess }));
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  logs: { portal: { venues: mocks.log } },
}));
vi.mock('../../../src/pages/venue-kit/offer-form', () => ({
  VenueKitOfferForm: (props: NonNullable<typeof mocks.formProps>) => {
    mocks.formProps = props;
    return props.open ? <div data-testid="offer-dialog" /> : null;
  },
}));

import VenueKitPlanCard from '../../../src/pages/venue-kit/VenueKitPlanCard';

const OFFER = {
  annual_price_paise: 1_199_900,
  included_table_labels: 30,
  extra_label_price_paise: 15_000,
  pos_activation_months: 12,
  gift_card_count: 10,
  gift_card_value_paise: 10_000,
  collab_gift_card_discount_pct: 10,
  order_benefit_pct: 1,
  updated_at: null,
};

beforeEach(() => {
  mocks.query = { data: { venueKitOffer: OFFER }, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue({}) };
  mocks.roles = ['ALL_VENUES_ACCESS'];
  mocks.formProps = null;
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('VenueKitPlanCard', () => {
  it('shows the saved plan, coming soon and annual only, with all seven features', () => {
    render(<VenueKitPlanCard />);
    expect(screen.getByLabelText('₹11,999 per year')).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
    expect(screen.getByText('Annual plan only')).toBeTruthy();
    expect(screen.getByText(/QR labels for up to 30 tables/)).toBeTruthy();
    expect(screen.getByText(/Extra labels are ₹150 each/)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });

  it('falls back to the launch plan while the offer is still loading, with a placeholder price', () => {
    mocks.query = { data: undefined, loading: true, error: undefined, refetch: vi.fn() };
    render(<VenueKitPlanCard />);
    expect(screen.queryByLabelText('₹9,999 per year')).toBeNull();
    expect(screen.getByText(/QR labels for up to 25 tables/)).toBeTruthy();
  });

  it('hides the editor from everyone but a Super Admin', () => {
    render(<VenueKitPlanCard />);
    expect(screen.queryByTestId('venue-kit-edit-plan')).toBeNull();
    expect(mocks.formProps).toBeNull();
  });

  it('lets a Super Admin edit the plan, refetches it and closes the editor', async () => {
    mocks.roles = ['SUPER_ADMIN'];
    mocks.save.mockResolvedValue({});
    render(<VenueKitPlanCard />);
    fireEvent.click(screen.getByTestId('venue-kit-edit-plan'));
    expect(screen.getByTestId('offer-dialog')).toBeTruthy();
    mocks.formProps?.onSubmit({ annual_price_paise: 1 });
    await waitFor(() => expect(mocks.notifySuccess).toHaveBeenCalledWith('Venue Kit plan updated'));
    expect(mocks.save).toHaveBeenCalledWith({ variables: { input: { annual_price_paise: 1 } } });
    expect(mocks.query.refetch).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('offer-dialog')).toBeNull());
  });

  it('keeps the editor open and says why when the save is refused', async () => {
    mocks.roles = ['SUPER_ADMIN'];
    mocks.save.mockRejectedValue(new Error('Access Denied'));
    render(<VenueKitPlanCard />);
    fireEvent.click(screen.getByTestId('venue-kit-edit-plan'));
    mocks.formProps?.onSubmit({});
    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith('Access Denied'));
    expect(mocks.log.warn).toHaveBeenCalled();
    expect(screen.getByTestId('offer-dialog')).toBeTruthy();
    mocks.formProps?.onClose();
    await waitFor(() => expect(screen.queryByTestId('offer-dialog')).toBeNull());
  });

  it('offers a retry when the plan cannot be read, and logs a retry that fails too', async () => {
    mocks.query = { data: undefined, loading: false, error: new Error('Server down'), refetch: vi.fn().mockRejectedValue(new Error('still down')) };
    render(<VenueKitPlanCard />);
    expect(screen.getByText('Server down')).toBeTruthy();
    fireEvent.click(screen.getByText('Try again'));
    await waitFor(() => expect(mocks.log.error).toHaveBeenCalledWith('venueKit', 'offerRetry', expect.objectContaining({ reason: 'still down' })));
  });

  it('reads a user with no roles as not an editor', () => {
    mocks.roles = undefined as unknown as string[];
    render(<VenueKitPlanCard />);
    expect(screen.queryByTestId('venue-kit-edit-plan')).toBeNull();
  });
});
