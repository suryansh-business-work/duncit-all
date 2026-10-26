import { createRef } from 'react';
import { Linking, type ScrollView } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { VenueChatContactLink } from '@/components/chat/VenueChatContactLink';
import { VenueChatHeaderBar } from '@/components/chat/VenueChatHeaderBar';
import { PodMessageType } from '@/generated/graphql/graphql';
import type { ChatMessage } from '@/hooks/useChat';
import type { ChatHistory } from '@/hooks/useChatHistory';
import { renderWithProviders } from '@/utils/test-utils';

const message = (id: string, text: string): ChatMessage => ({
  id,
  pod_id: 'pod-1',
  club_id: null,
  user_id: 'u1',
  user_name: 'Asha',
  user_photo: null,
  type: PodMessageType.Text,
  text,
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: '2026-08-29T10:00:00.000Z',
  reply_to_id: null,
  reply_to: null,
  mentions: [],
  mention_users: [],
});

const history: ChatHistory = {
  hasOlder: false,
  loadingOlder: false,
  olderFailed: false,
  startHistory: jest.fn(),
  loadOlder: jest.fn(() => Promise.resolve()),
  onScroll: jest.fn(),
};

let openURL: jest.SpyInstance;
beforeEach(() => {
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});
afterEach(() => openURL.mockRestore());

describe('VenueChatContactLink', () => {
  it('dials a phone number, named for a screen reader', () => {
    renderWithProviders(
      <VenueChatContactLink kind="phone" value="+91 9876543210" testID="contact-phone" />,
    );
    expect(screen.getByLabelText('Phone +91 9876543210')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('contact-phone'));
    expect(openURL).toHaveBeenCalledWith('tel:+91 9876543210');
  });

  it('opens the mail app for an email address', () => {
    renderWithProviders(
      <VenueChatContactLink kind="email" value="asha@venue.in" testID="contact-email" />,
    );
    expect(screen.getByLabelText('Email asha@venue.in')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('contact-email'));
    expect(openURL).toHaveBeenCalledWith('mailto:asha@venue.in');
  });
});

describe('VenueChatHeaderBar', () => {
  const counterpart = {
    name: 'Court House',
    photo: null,
    podTitle: 'Sunday Badminton',
    when: null,
    contact: { name: null, phone: '+91 9000000001', email: null },
  };

  it('names who the thread is with and the pod, and opens the contact sheet from Contact', () => {
    const onContact = jest.fn();
    renderWithProviders(
      <VenueChatHeaderBar
        counterpart={counterpart}
        venueSide={false}
        onBack={jest.fn()}
        onContact={onContact}
      />,
    );
    expect(screen.getByTestId('venue-chat-title')).toHaveTextContent('Court House');
    expect(screen.getByText('Sunday Badminton')).toBeOnTheScreen();
    // The ways to reach them live in the sheet now, not under the title.
    expect(screen.queryByLabelText('Phone +91 9000000001')).toBeNull();
    fireEvent.press(screen.getByTestId('venue-chat-contact-open'));
    expect(onContact).toHaveBeenCalledTimes(1);
  });

  it('offers no Contact before the thread is in', () => {
    renderWithProviders(<VenueChatHeaderBar counterpart={null} venueSide onBack={jest.fn()} />);
    expect(screen.queryByTestId('venue-chat-contact-open')).toBeNull();
  });
});

describe('ChatMessageList renderMessage', () => {
  it('draws a line its own way when asked, and keeps the bubble when it says null', () => {
    renderWithProviders(
      <ChatMessageList
        listRef={createRef<ScrollView>()}
        isLoading={false}
        messages={[message('m1', 'Hello there'), message('m2', 'Offer summary')]}
        history={history}
        meId="u2"
        renderMessage={(line) =>
          line.id === 'm2' ? <Text testID="custom-line">An offer card</Text> : null
        }
      />,
    );
    expect(screen.getByText('Hello there')).toBeOnTheScreen();
    expect(screen.getByTestId('custom-line')).toBeOnTheScreen();
    expect(screen.queryByText('Offer summary')).toBeNull();
  });
});
