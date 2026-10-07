import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { PartnerAvatar } from '@/components/pod-requests/PartnerAvatar';
import { PodRequestRow } from '@/components/pod-requests/PodRequestRow';
import { PodRequestStatusChip } from '@/components/pod-requests/PodRequestStatusChip';
import { PodRequestsSection } from '@/components/pod-requests/PodRequestsSection';
import { RespondButtons } from '@/components/pod-requests/RespondButtons';
import { PartnerSide } from '@/generated/graphql/graphql';
import { RespondPodPartnerRequestDocument } from '@/graphql/pod-requests';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const venue = {
  id: 'v1',
  venue_name: 'Hall',
  category: 'Sports',
  locality: 'Bandra',
  city: 'Mumbai',
  cover_image_url: '',
};
const host = { user_id: 'u1', name: 'Asha', photo_url: '', categories: ['Yoga'] };

const req = (id: string, direction: string, status: string, viewer_side = 'HOST', note = '') => ({
  id,
  direction,
  status,
  viewer_side,
  note,
  venue,
  host,
  created_at: '2030-01-01T00:00:00.000Z',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockReset();
});

describe('PodRequestStatusChip', () => {
  let colors: ReturnType<typeof useThemeColors> | null = null;
  function Probe() {
    colors = useThemeColors();
    return null;
  }

  it.each([
    ['REQUESTED', 'Requested', 'warning'],
    ['SLOT_CONFIRMED', 'Slot confirmed', 'success'],
    ['POD_CREATED', 'Pod created', 'success'],
    ['CANCELLED', 'Withdrawn', 'muted'],
    ['EXPIRED', 'Expired', 'muted'],
  ] as const)('words %s as "%s" in the %s tone', (status, label, tone) => {
    renderWithProviders(
      <>
        <Probe />
        <PodRequestStatusChip status={status} testID="chip" />
      </>,
    );
    expect(screen.getByTestId('chip')).toHaveTextContent(label);
    expect(within(screen.getByTestId('chip')).getByText(label)).toHaveStyle({
      color: colors?.[tone],
    });
  });
});

describe('PartnerAvatar', () => {
  it('draws the photo when there is one', () => {
    const { toJSON } = renderWithProviders(
      <PartnerAvatar kind="HOST" imageUrl="https://cdn/a.jpg" size={48} />,
    );
    expect(JSON.stringify(toJSON())).toContain('https://cdn/a.jpg');
  });

  it('falls back to a venue or a person glyph', () => {
    const venueTree = renderWithProviders(<PartnerAvatar kind="VENUE" imageUrl="" size={48} />);
    expect(JSON.stringify(venueTree.toJSON())).not.toContain('uri');
    venueTree.unmount();
    const hostTree = renderWithProviders(<PartnerAvatar kind="HOST" imageUrl="" size={50} />);
    expect(JSON.stringify(hostTree.toJSON())).not.toContain('uri');
  });
});

describe('RespondButtons', () => {
  it('answers yes or no, and is locked while busy', () => {
    const onAnswer = jest.fn();
    const { rerender } = renderWithProviders(
      <RespondButtons
        acceptLabel="Accept"
        declineLabel="Decline"
        busy={false}
        onAnswer={onAnswer}
        testID="rb"
      />,
    );
    fireEvent.press(screen.getByTestId('rb-accept'));
    fireEvent.press(screen.getByTestId('rb-decline'));
    expect(onAnswer.mock.calls).toEqual([[true], [false]]);

    rerender(
      <RespondButtons
        acceptLabel="Accept"
        declineLabel="Decline"
        busy
        onAnswer={onAnswer}
        testID="rb"
      />,
    );
    expect(screen.getByTestId('rb-accept').props['aria-disabled']).toBe(true);
    expect(screen.getByTestId('rb-decline').props['aria-disabled']).toBe(true);
  });
});

describe('PodRequestRow', () => {
  it('shows the venue a host is dealing with, its note and status, and opens the detail', () => {
    renderWithProviders(
      <PodRequestRow
        request={req('r1', 'VENUE_TO_HOST', 'ACCEPTED', 'HOST', 'Sunday?') as never}
      />,
    );
    const row = screen.getByTestId('pod-request-row-r1');
    expect(within(row).getByText('Hall')).toBeOnTheScreen();
    expect(within(row).getByText('Sports · Bandra · Mumbai')).toBeOnTheScreen();
    expect(within(row).getByText('Sunday?')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-request-status-r1')).toHaveTextContent('Accepted');
    fireEvent.press(screen.getByLabelText('Hall'));
    expect(mockNavigate).toHaveBeenCalledWith('PodRequestDetail', { id: 'r1' });
  });

  it('shows the host a venue owner is dealing with, without empty lines', () => {
    renderWithProviders(
      <PodRequestRow
        request={
          {
            ...req('r2', 'HOST_TO_VENUE', 'REQUESTED', 'VENUE'),
            host: { ...host, categories: [] },
          } as never
        }
      />,
    );
    const row = screen.getByTestId('pod-request-row-r2');
    expect(within(row).getByText('Asha')).toBeOnTheScreen();
    expect(within(row).queryByText('Hall')).toBeNull();
  });
});

describe('PodRequestsSection', () => {
  const list = (rows: unknown[]) => ({ myPodPartnerRequests: rows });

  it("splits a host's requests across the tabs and the sent list", async () => {
    mockRequest.mockResolvedValue(
      list([
        req('in1', 'VENUE_TO_HOST', 'REQUESTED'),
        req('acc1', 'VENUE_TO_HOST', 'ACCEPTED'),
        req('out1', 'HOST_TO_VENUE', 'REQUESTED'),
        req('out2', 'HOST_TO_VENUE', 'REJECTED'),
      ]),
    );
    renderWithProviders(<PodRequestsSection side={PartnerSide.Host} />);
    await waitFor(() => expect(screen.getByTestId('pod-requests-incoming')).toBeOnTheScreen());

    expect(screen.getByTestId('pod-requests-title')).toHaveTextContent('Pod Requests from Venues');
    expect(screen.getByTestId('pod-requests-tab-accepted')).toHaveTextContent(
      'Venue Accepted Requests',
    );
    expect(screen.getByTestId('pod-request-row-in1')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-request-respond-in1')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-request-row-acc1')).toBeNull();
    expect(screen.getByTestId('pod-requests-sent-title')).toHaveTextContent(
      /Your requests to venues.*2/,
    );

    fireEvent.press(screen.getByTestId('pod-requests-tab-accepted'));
    expect(screen.getByTestId('pod-request-row-acc1')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-request-row-in1')).toBeNull();

    fireEvent.press(screen.getByTestId('pod-requests-search'));
    expect(mockNavigate).toHaveBeenCalledWith('NearbyVenues');
  });

  it('accepting a request moves the viewer to the accepted tab', async () => {
    mockRequest
      .mockResolvedValueOnce(list([req('in1', 'HOST_TO_VENUE', 'REQUESTED', 'VENUE')]))
      .mockResolvedValueOnce({ respondPodPartnerRequest: { id: 'in1', status: 'ACCEPTED' } })
      .mockResolvedValueOnce(list([req('in1', 'HOST_TO_VENUE', 'ACCEPTED', 'VENUE')]));
    renderWithProviders(<PodRequestsSection side={PartnerSide.Venue} venueId="v1" />);
    await waitFor(() => expect(screen.getByTestId('pod-request-respond-in1')).toBeOnTheScreen());
    expect(screen.getByTestId('pod-requests-title')).toHaveTextContent('Pod Requests from Hosts');

    fireEvent.press(screen.getByTestId('pod-request-respond-in1-accept'));
    await waitFor(() => expect(screen.getByTestId('pod-requests-accepted')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(
      RespondPodPartnerRequestDocument,
      { id: 'in1', accept: true },
      { auth: true },
    );
    expect(screen.getByTestId('pod-request-row-in1')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('pod-requests-search'));
    expect(mockNavigate).toHaveBeenCalledWith('NearbyHosts');
  });

  it('declining stays on Requests and drops the row', async () => {
    mockRequest
      .mockResolvedValueOnce(list([req('in1', 'HOST_TO_VENUE', 'REQUESTED', 'VENUE')]))
      .mockResolvedValueOnce({ respondPodPartnerRequest: { id: 'in1', status: 'REJECTED' } })
      .mockResolvedValueOnce(list([]));
    renderWithProviders(<PodRequestsSection side={PartnerSide.Venue} venueId="v1" />);
    await waitFor(() => expect(screen.getByTestId('pod-request-respond-in1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('pod-request-respond-in1-decline'));
    await waitFor(() =>
      expect(screen.getByTestId('pod-requests-incoming-empty')).toBeOnTheScreen(),
    );
    expect(screen.getByTestId('pod-requests-incoming-empty')).toHaveTextContent(
      'No new Pod Requests yet.',
    );
    expect(screen.queryByTestId('pod-requests-accepted')).toBeNull();
  });

  it('shows a refused answer and keeps the row on Requests', async () => {
    mockRequest
      .mockResolvedValueOnce(list([req('in1', 'HOST_TO_VENUE', 'REQUESTED', 'VENUE')]))
      .mockRejectedValueOnce(new Error('This request was withdrawn.'));
    renderWithProviders(<PodRequestsSection side={PartnerSide.Venue} venueId="v1" />);
    await waitFor(() => expect(screen.getByTestId('pod-request-respond-in1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('pod-request-respond-in1-accept'));
    await waitFor(() =>
      expect(screen.getByTestId('pod-requests-error')).toHaveTextContent(
        'This request was withdrawn.',
      ),
    );
    expect(screen.getByTestId('pod-request-row-in1')).toBeOnTheScreen();
  });

  it('shows the empty lines, and the list failure', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Service unavailable'));
    renderWithProviders(<PodRequestsSection side={PartnerSide.Host} />);
    await waitFor(() =>
      expect(screen.getByTestId('pod-requests-error')).toHaveTextContent('Service unavailable'),
    );
    expect(screen.getByTestId('pod-requests-incoming-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-requests-sent-empty')).toHaveTextContent(
      'Requests you send appear here.',
    );
    fireEvent.press(screen.getByTestId('pod-requests-tab-accepted'));
    expect(screen.getByTestId('pod-requests-accepted-empty')).toHaveTextContent(
      'Requests you accept appear here.',
    );
  });

  it('shows the spinner and no lists while loading', () => {
    mockRequest.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<PodRequestsSection side={PartnerSide.Host} />);
    expect(screen.getByLabelText('Loading…')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-requests-incoming-empty')).toBeNull();
    expect(screen.queryByTestId('pod-requests-sent-empty')).toBeNull();
  });
});
