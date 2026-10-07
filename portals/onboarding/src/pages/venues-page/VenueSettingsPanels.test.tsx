import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import VenueSettingsPanels from './VenueSettingsPanels';
import { DEFAULT_VENUE_COMMISSION, SET_VENUE_HOST_REQUEST_LIMIT } from './queries';

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

function renderPanels(mocks: unknown[]) {
  const onSaved = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as any}>
      <VenueSettingsPanels venue={venue} onSaved={onSaved} />
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
