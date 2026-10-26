import { Linking } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import type { VenueChatReadMark } from '@duncit/utils';

import { VenueChatContactSheet } from '@/components/venue-chat/VenueChatContactSheet';
import { VenueChatOfferPin } from '@/components/venue-chat/VenueChatOfferPin';
import { VenueChatSeenFaces } from '@/components/venue-chat/VenueChatSeenFaces';
import { VenueOfferStatus } from '@/generated/graphql/graphql';
import { renderWithProviders } from '@/utils/test-utils';
import { counteredOffer, offerTerms, venueChatRoomFixture } from '@/utils/venue-offer-fixture';

const { host, venue } = venueChatRoomFixture();

let openURL: jest.SpyInstance;
beforeEach(() => {
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});
afterEach(() => openURL.mockRestore());

describe('VenueChatOfferPin', () => {
  it("tells the host it is their move on the venue's counter, with both sides' counters left and the answer-by time", () => {
    renderWithProviders(
      <VenueChatOfferPin offer={counteredOffer({ host_counters_used: 2 })} side="HOST" />,
    );
    expect(screen.getByText('Booking offer')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-chat-offer-pin-status')).toHaveTextContent('Your move');
    expect(screen.getByTestId('venue-chat-offer-pin-counters')).toHaveTextContent(
      'You: 1 of 3 counters left · Venue: 2 of 3 left',
    );
    expect(screen.getByTestId('offer-answer-by')).toBeOnTheScreen();
  });

  it("names the host's allowance to the venue, while it waits on the host", () => {
    renderWithProviders(<VenueChatOfferPin offer={counteredOffer()} side="VENUE" />);
    expect(screen.getByTestId('venue-chat-offer-pin-status')).toHaveTextContent(
      'Waiting for their answer',
    );
    expect(screen.getByTestId('venue-chat-offer-pin-counters')).toHaveTextContent(
      'You: 2 of 3 counters left · Host: 3 of 3 left',
    );
  });

  it('says the booking is confirmed once accepted, with no counters or deadline', () => {
    renderWithProviders(
      <VenueChatOfferPin
        offer={offerTerms({ status: VenueOfferStatus.Accepted, awaiting: null })}
        side="HOST"
      />,
    );
    expect(screen.getByTestId('venue-chat-offer-pin-status')).toHaveTextContent(
      'Booking confirmed',
    );
    expect(screen.queryByTestId('venue-chat-offer-pin-counters')).toBeNull();
    expect(screen.queryByTestId('offer-answer-by')).toBeNull();
  });

  it('pins nothing while the pod has no live offer', () => {
    renderWithProviders(<VenueChatOfferPin offer={null} side="HOST" />);
    expect(screen.queryByTestId('venue-chat-offer-pin')).toBeNull();
  });
});

describe('VenueChatContactSheet', () => {
  const mount = (over: Partial<Parameters<typeof VenueChatContactSheet>[0]> = {}) => {
    const props = {
      open: true,
      host,
      venue,
      onClose: jest.fn(),
      onViewProfile: jest.fn(),
      onViewVenue: jest.fn(),
      ...over,
    };
    renderWithProviders(<VenueChatContactSheet {...props} />);
    return props;
  };

  it("shows the host's profile and how to reach them, and opens their profile", () => {
    const props = mount();
    const card = screen.getByTestId('venue-chat-host-card');
    expect(within(card).getByText('Ravi Kumar')).toBeOnTheScreen();
    expect(within(card).getByText('@ravi')).toBeOnTheScreen();
    expect(within(card).getByText('Weekend badminton host')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-chat-host-phone'));
    expect(openURL).toHaveBeenCalledWith('tel:+91 9000000002');
    fireEvent.press(screen.getByTestId('venue-chat-host-email'));
    expect(openURL).toHaveBeenCalledWith('mailto:ravi@example.com');
    fireEvent.press(screen.getByTestId('venue-chat-host-profile'));
    // The sheet closes; the chat stays underneath.
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onViewProfile).toHaveBeenCalledWith('host-1');
  });

  it("shows the venue's facts, who to ask for and only the ways on record, and opens its page", () => {
    const props = mount();
    const card = screen.getByTestId('venue-chat-venue-card');
    expect(within(card).getByText('Sports court · Up to 40 guests')).toBeOnTheScreen();
    expect(within(card).getByText('12 MG Road, Indiranagar, Bengaluru')).toBeOnTheScreen();
    expect(within(card).getByText('Ask for Asha Rao')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-chat-venue-phone')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-chat-venue-email')).toBeNull();
    fireEvent.press(screen.getByTestId('venue-chat-venue-page'));
    expect(props.onViewVenue).toHaveBeenCalledWith('venue-1');
  });

  it('says when a side has no phone or email on record, and leaves out a host not on record', () => {
    mount({ host: null, venue: venue && { ...venue, phone: '', email: ' ', name: '' } });
    expect(screen.queryByTestId('venue-chat-host-card')).toBeNull();
    expect(screen.getByTestId('venue-chat-venue-no-contact')).toHaveTextContent(
      'No phone or email on record',
    );
    expect(screen.queryByText(/^Ask for/)).toBeNull();
  });

  it('shows nothing while closed', () => {
    mount({ open: false });
    expect(screen.queryByTestId('venue-chat-host-card')).toBeNull();
  });
});

describe('VenueChatSeenFaces', () => {
  const face = (user_id: string, name: string): VenueChatReadMark => ({
    user_id,
    side: 'VENUE',
    name,
    photo: null,
    last_read_at: '2026-08-29T10:00:00.000Z',
  });

  it('draws a face per reader and names them all once', () => {
    renderWithProviders(
      <VenueChatSeenFaces lineId="l1" faces={[face('a', 'Asha'), face('b', 'Bilal')]} />,
    );
    expect(screen.getByLabelText('Seen by Asha, Bilal')).toBeOnTheScreen();
    // Each face is hidden from screen readers — the group's label names them all once.
    expect(
      screen.getByTestId('venue-chat-seen-face-a', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('venue-chat-seen-face-b', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('draws nothing under a line nobody stopped at', () => {
    renderWithProviders(<VenueChatSeenFaces lineId="l1" faces={undefined} />);
    expect(screen.queryByTestId('venue-chat-seen-l1')).toBeNull();
    renderWithProviders(<VenueChatSeenFaces lineId="l2" faces={[]} />);
    expect(screen.queryByTestId('venue-chat-seen-l2')).toBeNull();
  });
});
