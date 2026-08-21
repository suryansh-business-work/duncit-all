import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import {
  ClubAdminCard,
  PendingBanner,
  PodPendingSummaryCard,
  VenuePendingCard,
} from '@/components/pod-pending';
import { CategoryMediaType, PodVenueApproval } from '@/generated/graphql/graphql';
import type { PodPendingView } from '@/hooks/usePodPendingView';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));

const fullView: PodPendingView = {
  pod: {
    id: 'p1',
    pod_title: 'Sunset Jam',
    pod_images_and_videos: [{ url: 'https://cdn/a.jpg', type: CategoryMediaType.Image }],
    pod_date_time: '2026-08-01T18:30:00.000Z',
    pod_end_date_time: '2026-08-01T20:30:00.000Z',
    place_label: 'The Loft',
    place_detail: 'Indiranagar',
    venue_approval_status: PodVenueApproval.Pending,
  },
  category_name: 'Music',
  expected_earnings: 1234.5,
  currency_symbol: '₹',
  venue: {
    venue_id: 'v1',
    venue_name: 'The Loft',
    contact_person: 'Asha Rao',
    phone: '+91 9876543210',
    email: 'loft@venues.in',
    address: '12 MG Road, Bengaluru',
    lat: 12.97,
    lng: 77.59,
  },
  club_admin: {
    user_id: 'u9',
    name: 'Ravi Kumar',
    profile_photo: 'https://cdn/ravi.jpg',
    phone: '+91 9000000001',
    whatsapp: '+91 9000000002',
    email: 'ravi@duncit.com',
  },
};

let openURL: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

describe('PendingBanner', () => {
  it('shows the heading and subheading under the tick', () => {
    renderWithProviders(<PendingBanner status="PENDING" />);
    expect(screen.getByTestId('pod-pending-banner')).toBeOnTheScreen();
    expect(
      screen.getByText('Your Pod will go live once the venue accepts your slot request.'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/notified as soon as the venue approves/)).toBeOnTheScreen();
  });
});

describe('PodPendingSummaryCard', () => {
  it('renders image, title and every detail row', () => {
    renderWithProviders(<PodPendingSummaryCard view={fullView} />);
    expect(screen.getByTestId('pod-pending-image')).toBeOnTheScreen();
    expect(screen.getByText('Sunset Jam')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-pending-when')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-pending-earnings')).toHaveTextContent('₹1234.50');
    expect(screen.getByTestId('pod-pending-location')).toHaveTextContent('The Loft · Indiranagar');
    expect(screen.getByTestId('pod-pending-category')).toHaveTextContent('Music');
    expect(screen.getByTestId('pod-pending-status')).toHaveTextContent('Awaiting venue approval');
  });

  it('hides the image, location and category rows when absent', () => {
    const view: PodPendingView = {
      ...fullView,
      category_name: '',
      pod: {
        ...fullView.pod,
        pod_images_and_videos: [],
        place_label: null,
        place_detail: null,
      },
    };
    renderWithProviders(<PodPendingSummaryCard view={view} />);
    expect(screen.queryByTestId('pod-pending-image')).toBeNull();
    expect(screen.queryByTestId('pod-pending-location')).toBeNull();
    expect(screen.queryByTestId('pod-pending-category')).toBeNull();
  });
});

describe('VenuePendingCard', () => {
  it('shows the pending badge, contact rows and opens the map link', () => {
    renderWithProviders(
      <VenuePendingCard venue={fullView.venue!} status={PodVenueApproval.Pending} />,
    );
    expect(screen.getByTestId('venue-pending-badge')).toHaveTextContent('Pending Approval');
    expect(screen.getByTestId('venue-pending-contact')).toHaveTextContent('Asha Rao');
    expect(screen.getByTestId('venue-pending-phone')).toHaveTextContent('+91 9876543210');
    expect(screen.getByTestId('venue-pending-email')).toHaveTextContent('loft@venues.in');
    expect(screen.getByTestId('venue-pending-address')).toHaveTextContent('12 MG Road, Bengaluru');
    expect(screen.getByTestId('venue-pending-approval')).toHaveTextContent('Pending Approval');
    fireEvent.press(screen.getByTestId('venue-pending-map'));
    expect(openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=12.97%2C77.59',
    );
  });

  it('hides optional rows and the map button when nothing is on file', () => {
    renderWithProviders(
      <VenuePendingCard
        venue={{
          venue_id: 'v2',
          venue_name: '',
          contact_person: null,
          phone: null,
          email: null,
          address: null,
          lat: null,
          lng: null,
        }}
        status={PodVenueApproval.Approved}
      />,
    );
    expect(screen.queryByTestId('venue-pending-contact')).toBeNull();
    expect(screen.queryByTestId('venue-pending-phone')).toBeNull();
    expect(screen.queryByTestId('venue-pending-email')).toBeNull();
    expect(screen.queryByTestId('venue-pending-address')).toBeNull();
    expect(screen.queryByTestId('venue-pending-map')).toBeNull();
    expect(screen.getByTestId('venue-pending-badge')).toHaveTextContent('Approved');
  });
});

describe('ClubAdminCard', () => {
  it('shows the profile, contact rows and fires Call / Message / Email', () => {
    renderWithProviders(<ClubAdminCard admin={fullView.club_admin!} />);
    expect(screen.getByText('Need Help? Contact the Club Admin')).toBeOnTheScreen();
    expect(screen.getByTestId('club-admin-photo')).toBeOnTheScreen();
    expect(screen.getByText('Ravi Kumar')).toBeOnTheScreen();
    expect(screen.getByTestId('club-admin-phone')).toHaveTextContent('+91 9000000001');
    expect(screen.getByTestId('club-admin-whatsapp')).toHaveTextContent('+91 9000000002');
    expect(screen.getByTestId('club-admin-email')).toHaveTextContent('ravi@duncit.com');

    fireEvent.press(screen.getByTestId('club-admin-call'));
    expect(openURL).toHaveBeenCalledWith('tel:+91 9000000001');
    fireEvent.press(screen.getByTestId('club-admin-message'));
    expect(openURL).toHaveBeenCalledWith('https://wa.me/919000000002');
    fireEvent.press(screen.getByTestId('club-admin-email-action'));
    expect(openURL).toHaveBeenCalledWith('mailto:ravi@duncit.com');
  });

  it('falls back to an avatar icon and hides absent contact rows/actions', () => {
    renderWithProviders(
      <ClubAdminCard
        admin={{
          name: 'Meera',
          profile_photo: null,
          phone: null,
          whatsapp: null,
          email: null,
        }}
      />,
    );
    expect(screen.getByTestId('club-admin-avatar-fallback')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-admin-photo')).toBeNull();
    expect(screen.queryByTestId('club-admin-phone')).toBeNull();
    expect(screen.queryByTestId('club-admin-whatsapp')).toBeNull();
    expect(screen.queryByTestId('club-admin-email')).toBeNull();
    expect(screen.queryByTestId('club-admin-call')).toBeNull();
    expect(screen.queryByTestId('club-admin-message')).toBeNull();
    expect(screen.queryByTestId('club-admin-email-action')).toBeNull();
  });
});
