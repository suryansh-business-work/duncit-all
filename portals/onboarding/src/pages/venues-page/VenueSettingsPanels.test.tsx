import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import VenueSettingsPanels from './VenueSettingsPanels';
import {
  DEFAULT_VENUE_COMMISSION,
  SET_VENUE_CANCELLATION_TRIGGER,
  SET_VENUE_DEDUCTIONS,
  SET_VENUE_HOST_REQUEST_LIMIT,
} from './queries';

const defaults = {
  request: { query: DEFAULT_VENUE_COMMISSION },
  result: { data: { defaultVenueCommissionPct: 15 } },
};

const limitSaved = (limit: number | null) => ({
  request: { query: SET_VENUE_HOST_REQUEST_LIMIT, variables: { id: 'v1', limit } },
  result: {
    data: { setVenueHostRequestLimit: { __typename: 'Venue', id: 'v1', host_requests_limit_override: limit } },
  },
});

const venue = { id: 'v1', venue_name: 'The Loft', venue_commission_pct: 0, host_requests_limit_override: 6 };

function renderPanels(mocks: unknown[], forVenue: Record<string, unknown> = venue) {
  const onSaved = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as any}>
      <VenueSettingsPanels venue={forVenue} onSaved={onSaved} />
    </MockedProvider>,
  );
  return onSaved;
}

const limitInput = () => screen.getByTestId('venue-request-limit-input');

describe('VenueSettingsPanels — monthly host Pod Request limit', () => {
  it('shows the venue’s admin-set limit beside the deductions', () => {
    renderPanels([defaults]);
    expect(screen.getByLabelText('Maximum Host Requests / Month')).toHaveValue(6);
    expect(screen.getByText('Venue deductions')).toBeInTheDocument();
  });

  it('saves through setVenueHostRequestLimit, keeps the saved value and refreshes the table', async () => {
    const onSaved = renderPanels([defaults, limitSaved(20)]);
    fireEvent.change(limitInput(), { target: { value: '20' } });
    await waitFor(() => expect(screen.getByTestId('venue-request-limit-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('venue-request-limit-save'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(limitInput()).toHaveValue(20);
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('clears the limit with null, so the default of 10 applies', async () => {
    const onSaved = renderPanels([defaults, limitSaved(null)]);
    fireEvent.change(limitInput(), { target: { value: '' } });
    await waitFor(() => expect(screen.getByTestId('venue-request-limit-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('venue-request-limit-save'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(limitInput()).toHaveValue(null);
  });
});

describe('VenueSettingsPanels — without a venue', () => {
  it('renders no panels while no venue is open', () => {
    const { container } = render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[defaults] as any}>
        <VenueSettingsPanels venue={null} onSaved={vi.fn()} />
      </MockedProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('VenueSettingsPanels — deductions', () => {
  const deductionsSaved = (share: number, commission: number) => ({
    request: {
      query: SET_VENUE_DEDUCTIONS,
      variables: { id: 'v1', venue_share_pct: share, venue_commission_pct: commission },
    },
    result: {
      data: {
        setVenueDeductions: {
          __typename: 'Venue',
          id: 'v1',
          venue_share_pct: share,
          venue_commission_pct: commission,
        },
      },
    },
  });

  it('saves the commission override with the venue share kept as it was, and keeps the saved number', async () => {
    const onSaved = renderPanels([defaults, deductionsSaved(70, 12)], { ...venue, venue_share_pct: 70 });
    const commission = await screen.findByLabelText('Venue commission percentage');
    // The venue has no override of its own, so the field opens on the Finance default of 15%.
    await waitFor(() => expect(commission).toHaveValue(15));
    fireEvent.change(commission, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save deductions' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(commission).toHaveValue(12);
    // What was just saved is now what is stored, so there is nothing more to save.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save deductions' })).toBeDisabled());
  });
});

describe('VenueSettingsPanels — cancellation trigger', () => {
  const triggerSaved = (hours: number) => ({
    request: {
      query: SET_VENUE_CANCELLATION_TRIGGER,
      variables: { id: 'v1', trigger_hours: hours, refund_tiers: [{ hours_before: 24, refund_pct: 50 }] },
    },
    result: {
      data: {
        setVenueCancellationTrigger: {
          __typename: 'Venue',
          id: 'v1',
          settings: {
            __typename: 'VenueSettings',
            cancellation: {
              __typename: 'VenueCancellation',
              trigger_hours: hours,
              refund_tiers: [{ __typename: 'VenueCancellationRefundTier', hours_before: 24, refund_pct: 50 }],
            },
          },
        },
      },
    },
  });

  it('saves the trigger and its refund ladder, tells the table, and keeps the saved window', async () => {
    const onSaved = renderPanels([defaults, triggerSaved(8)], {
      ...venue,
      settings: { cancellation: { trigger_hours: 6, refund_tiers: [{ hours_before: 24, refund_pct: 50 }] } },
    });
    const trigger = await screen.findByLabelText('Cancellation trigger');
    expect(trigger).toHaveValue(6);

    fireEvent.change(trigger, { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save cancellation trigger' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(trigger).toHaveValue(8);
  });
});
