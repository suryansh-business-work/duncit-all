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
});
