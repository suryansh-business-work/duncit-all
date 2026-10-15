import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VenuePodsSection } from '@/components/details/VenuePodsSection';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
// The card's own states are covered in RequestEventCard.test — here only WHEN
// the section offers it, and for which venue.
jest.mock('@/components/event-request', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    RequestEventCard: (p: { targetType: string; targetId: string; targetName: string }) => (
      <Text testID="request-event-card">{`${p.targetType}:${p.targetId}:${p.targetName}`}</Text>
    ),
  };
});

const pod = {
  id: 'p1',
  pod_id: 'POD-1',
  pod_title: 'Evening Match',
  pod_date_time: new Date(Date.now() + 48 * 3_600_000).toISOString(),
  pod_end_date_time: new Date(Date.now() + 50 * 3_600_000).toISOString(),
  pod_type: 'PAID',
  pod_amount: 300,
  pod_attendees: [],
  no_of_spots: 10,
  host_names: ['Asha'],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 'club-1',
  pod_mode: 'PHYSICAL',
  place_label: 'Turf One',
  place_detail: '',
};

const WEEK_MS = 7 * 24 * 3_600_000;
const pastPod = {
  ...pod,
  id: 'p0',
  pod_id: 'POD-0',
  pod_title: 'Last Week Match',
  pod_date_time: new Date(Date.now() - WEEK_MS).toISOString(),
  pod_end_date_time: new Date(Date.now() - WEEK_MS + 2 * 3_600_000).toISOString(),
};

beforeEach(() => {
  mockRequest.mockReset();
  mockNavigate.mockReset();
});

describe('VenuePodsSection', () => {
  it('lists the pods hosted at the venue and opens a pod', async () => {
    mockRequest.mockResolvedValue({ pods: [pod] });
    renderWithProviders(<VenuePodsSection venueId="v1" />);
    await waitFor(() => expect(screen.getByTestId('club-pods-schedule')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(expect.anything(), { venueId: 'v1' }, { auth: true });
    fireEvent.press(screen.getByText('Evening Match'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', {
      clubSlug: 'club-1',
      podSlug: 'POD-1',
    });
  });

  it('shows the empty state when the venue has no pods', async () => {
    mockRequest.mockResolvedValue({ pods: [] });
    renderWithProviders(<VenuePodsSection venueId="v1" />);
    await waitFor(() => expect(screen.getByTestId('venue-no-pods')).toBeOnTheScreen());
  });

  it('tolerates a failed pods load', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(<VenuePodsSection venueId="v1" />);
    await waitFor(() => expect(screen.getByTestId('venue-no-pods')).toBeOnTheScreen());
  });

  it('offers Request an event on its own page when the venue has no pods', async () => {
    mockRequest.mockResolvedValue({ pods: [] });
    renderWithProviders(<VenuePodsSection venueId="v1" venueName="Turf One" />);
    expect(await screen.findByTestId('request-event-card')).toHaveTextContent('VENUE:v1:Turf One');
    expect(screen.getByTestId('venue-no-pods')).toBeOnTheScreen();
  });

  it('offers it under the schedule when every pod is already over', async () => {
    mockRequest.mockResolvedValue({ pods: [pastPod] });
    renderWithProviders(<VenuePodsSection venueId="v1" venueName="Turf One" />);
    expect(await screen.findByTestId('request-event-card')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pods-schedule')).toBeOnTheScreen();
  });

  it('does not offer it while a pod is still coming up', async () => {
    mockRequest.mockResolvedValue({ pods: [pastPod, pod] });
    renderWithProviders(<VenuePodsSection venueId="v1" venueName="Turf One" />);
    await waitFor(() => expect(screen.getByTestId('club-pods-schedule')).toBeOnTheScreen());
    expect(screen.queryByTestId('request-event-card')).toBeNull();
  });

  it('does not offer it while the pods are loading', () => {
    mockRequest.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<VenuePodsSection venueId="v1" venueName="Turf One" />);
    expect(screen.getByTestId('venue-pods-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-card')).toBeNull();
  });

  it('does not offer it without the venue name (outside the venue page)', async () => {
    mockRequest.mockResolvedValue({ pods: [] });
    renderWithProviders(<VenuePodsSection venueId="v1" />);
    await waitFor(() => expect(screen.getByTestId('venue-no-pods')).toBeOnTheScreen());
    expect(screen.queryByTestId('request-event-card')).toBeNull();
  });
});
