import { Linking, Modal } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodHistoryActions } from '@/components/pod-history/PodHistoryActions';
import { ProfilePanels } from '@/components/profile/ProfilePanels';
import { ProfilePostsGrid } from '@/components/profile/ProfilePostsGrid';
import { PublicProfileBadges } from '@/components/public-profile/PublicProfileBadges';
import { TicketForm } from '@/components/support/TicketForm';
import { createTicket } from '@/hooks/useSupport';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupport', () => ({ createTicket: jest.fn() }));
const mockCreateTicket = createTicket as jest.Mock;

describe('PodHistoryActions busy ticket', () => {
  it('shows the downloading label while the ticket is preparing', () => {
    renderWithProviders(
      <PodHistoryActions
        item={
          {
            id: 'm1',
            status: 'JOINED',
            pod: { id: 'p1' },
            payment_id: 'pay1',
            refund_status: 'NONE',
          } as never
        }
        backingOut={false}
        invoiceBusy={false}
        ticketBusy
        onPodDetails={jest.fn()}
        onBackout={jest.fn()}
        onRefundStatus={jest.fn()}
        onInvoice={jest.fn()}
        onTicket={jest.fn()}
        onSupport={jest.fn()}
      />,
    );
    expect(screen.getByText('Downloading…')).toBeOnTheScreen();
  });
});

describe('ProfilePanels', () => {
  it('opens links + pet accordions and shows management labels', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    renderWithProviders(
      <ProfilePanels
        me={
          {
            roles: ['HOST', 'VENUE_OWNER'],
            profile_links: [{ url: 'https://x.com', label: 'Website' }],
            pet_profile: { name: 'Rex', species: 'Dog', breed: 'Lab', age: 3, bio: 'Good boy' },
          } as never
        }
        onOpenHost={jest.fn()}
        onOpenVenue={jest.fn()}
      />,
    );
    expect(screen.getByText('Hosts Management')).toBeOnTheScreen();
    expect(screen.getByText('Venue Management')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('accordion-links-header'));
    fireEvent.press(screen.getByLabelText('Website'));
    expect(openSpy).toHaveBeenCalledWith('https://x.com');

    fireEvent.press(screen.getByTestId('accordion-pet-header'));
    expect(screen.getByText('Good boy')).toBeOnTheScreen();
    expect(screen.getByText(/3 yrs/)).toBeOnTheScreen();
    openSpy.mockRestore();
  });
});

describe('ProfilePostsGrid viewer', () => {
  it('opens posts and closes via request-close and backdrop', () => {
    renderWithProviders(
      <ProfilePostsGrid
        posts={[
          { id: '1', image_url: 'https://i/a.jpg', caption: 'A' } as never,
          { id: '2', image_url: null, caption: 'B' } as never,
        ]}
      />,
    );
    fireEvent.press(screen.getByTestId('post-1'));
    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
    fireEvent.press(screen.getByTestId('post-2'));
    fireEvent.press(screen.getByTestId('post-viewer'));
    expect(screen.getByTestId('post-1')).toBeOnTheScreen();
  });
});

describe('PublicProfileBadges', () => {
  it('renders a titleless badge and closes the sheet via request-close', () => {
    renderWithProviders(
      <PublicProfileBadges
        badges={[
          {
            id: 'b1',
            badge: { title: 'Star', image_url: null, description: 'desc' },
            awarded_at: '2026-06-01',
          } as never,
          { id: 'b2', badge: null, awarded_at: null } as never,
        ]}
      />,
    );
    fireEvent.press(screen.getByTestId('badge-b1'));
    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
    expect(screen.getByTestId('public-profile-badges')).toBeOnTheScreen();
  });
});

describe('TicketForm failure', () => {
  it('shows an error when ticket creation fails', async () => {
    mockCreateTicket.mockRejectedValueOnce(new Error('boom'));
    renderWithProviders(<TicketForm onCreated={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('ticket-subject'), 'Help');
    fireEvent.changeText(screen.getByTestId('ticket-message'), 'It broke');
    fireEvent.press(screen.getByTestId('ticket-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('ticket-error')).toHaveTextContent(
        'Could not create the ticket. Please try again.',
      ),
    );
  });
});
