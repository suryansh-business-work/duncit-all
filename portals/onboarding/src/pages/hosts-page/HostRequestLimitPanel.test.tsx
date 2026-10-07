import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import HostRequestLimitPanel from './HostRequestLimitPanel';
import { SET_HOST_VENUE_REQUEST_LIMIT } from './queries';

const saved = (limit: number | null) => ({
  request: { query: SET_HOST_VENUE_REQUEST_LIMIT, variables: { id: 'h1', limit } },
  result: {
    data: {
      setHostVenueRequestLimit: { __typename: 'Host', id: 'h1', venue_requests_limit_override: limit },
    },
  },
});

const refused = {
  request: { query: SET_HOST_VENUE_REQUEST_LIMIT, variables: { id: 'h1', limit: 12 } },
  result: { errors: [{ message: 'Not authorized' }] },
};

function renderPanel(mocks: unknown[], limit: number | null = null) {
  const onSaved = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as any}>
      <HostRequestLimitPanel host={{ id: 'h1', venue_requests_limit_override: limit }} onSaved={onSaved} />
    </MockedProvider>,
  );
  return onSaved;
}

const input = () => screen.getByTestId('host-request-limit-input');

describe('HostRequestLimitPanel', () => {
  it('labels the field as the host’s monthly venue-request limit and shows the stored value', () => {
    renderPanel([], 15);
    expect(screen.getByLabelText('Maximum Venue Requests / Month')).toHaveValue(15);
  });

  it('saves the limit through setHostVenueRequestLimit, then refreshes the table', async () => {
    const onSaved = renderPanel([saved(12)]);
    fireEvent.change(input(), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('host-request-limit-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('clears the limit with null so the default of 10 applies again', async () => {
    const onSaved = renderPanel([saved(null)], 30);
    fireEvent.change(input(), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('host-request-limit-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('shows a server refusal and does not refresh', async () => {
    const onSaved = renderPanel([refused]);
    fireEvent.change(input(), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('host-request-limit-save'));
    expect(await screen.findByTestId('host-request-limit-error')).toHaveTextContent('Not authorized');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
