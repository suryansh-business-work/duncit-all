import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HostSettingsCard } from '@/components/host-manage/HostSettingsCard';
import { SetMyVenueRequestLimitDocument } from '@/graphql/pod-requests';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const host = (override: number | null = null) => ({
  id: 'h1',
  max_venue_requests_per_month: 12,
  venue_requests_limit_override: override,
});

beforeEach(() => mockRequest.mockReset());

describe('HostSettingsCard', () => {
  it('shows a spinner while the cap loads', () => {
    mockRequest.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<HostSettingsCard />);
    expect(screen.getByTestId('host-settings-title')).toHaveTextContent('Host Settings');
    expect(screen.getByLabelText('Loading…')).toBeOnTheScreen();
  });

  it("edits the host's monthly cap and confirms the save", async () => {
    mockRequest.mockResolvedValueOnce({ myHost: host() }).mockResolvedValueOnce({
      setMyVenueRequestLimit: { ...host(), max_venue_requests_per_month: 30 },
    });
    renderWithProviders(<HostSettingsCard />);
    await waitFor(() => expect(screen.getByTestId('field-limit').props.value).toBe('12'));
    expect(screen.queryByTestId('host-venue-request-limit-form-override')).toBeNull();

    fireEvent.changeText(screen.getByTestId('field-limit'), '30');
    fireEvent.press(screen.getByTestId('host-venue-request-limit-form-save'));
    await waitFor(() =>
      expect(screen.getByTestId('host-venue-request-limit-form-saved')).toBeOnTheScreen(),
    );
    expect(mockRequest).toHaveBeenLastCalledWith(
      SetMyVenueRequestLimitDocument,
      { limit: 30 },
      {
        auth: true,
      },
    );
    expect(screen.getByTestId('field-limit').props.value).toBe('30');
  });

  it("shows Duncit's cap and a refused save", async () => {
    mockRequest
      .mockResolvedValueOnce({ myHost: host(4) })
      .mockRejectedValueOnce(new Error('Only approved hosts can set this.'));
    renderWithProviders(<HostSettingsCard />);
    await waitFor(() =>
      expect(screen.getByTestId('host-venue-request-limit-form-override')).toHaveTextContent(
        'Set by Duncit: 4 per month.',
      ),
    );
    fireEvent.press(screen.getByTestId('host-venue-request-limit-form-save'));
    await waitFor(() =>
      expect(screen.getByTestId('host-venue-request-limit-form-error')).toHaveTextContent(
        'Only approved hosts can set this.',
      ),
    );
  });

  it('shows a failed load', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Offline'));
    renderWithProviders(<HostSettingsCard />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Offline'));
    expect(screen.queryByTestId('host-venue-request-limit-form')).toBeNull();
  });

  it('draws nothing without a host profile', async () => {
    mockRequest.mockResolvedValueOnce({ myHost: null });
    renderWithProviders(<HostSettingsCard />);
    await waitFor(() => expect(screen.queryByTestId('host-settings')).toBeNull());
  });
});
