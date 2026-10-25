import { createRef } from 'react';
import { Linking, type ScrollView } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { VenueChatContactRow } from '@/components/chat/VenueChatContactRow';
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

describe('VenueChatContactRow', () => {
  it('shows nothing when the room carries no way to reach them', () => {
    renderWithProviders(<VenueChatContactRow contact={null} />);
    expect(screen.queryByTestId('venue-chat-contact')).toBeNull();
  });

  it('names them, dials the phone and opens the mail app', () => {
    renderWithProviders(
      <VenueChatContactRow
        contact={{ name: 'Asha Rao', phone: '+91 9876543210', email: 'asha@venue.in' }}
      />,
    );
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByLabelText('Phone +91 9876543210')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-chat-contact-phone'));
    expect(openURL).toHaveBeenCalledWith('tel:+91 9876543210');
    fireEvent.press(screen.getByTestId('venue-chat-contact-email'));
    expect(openURL).toHaveBeenCalledWith('mailto:asha@venue.in');
  });

  it('shows only the ways on record', () => {
    renderWithProviders(
      <VenueChatContactRow contact={{ name: null, phone: null, email: 'a@b.in' }} />,
    );
    expect(screen.queryByTestId('venue-chat-contact-phone')).toBeNull();
    expect(screen.getByTestId('venue-chat-contact-email')).toBeOnTheScreen();
  });
});

describe('VenueChatHeaderBar', () => {
  it('carries the contact row under who the thread is with', () => {
    renderWithProviders(
      <VenueChatHeaderBar
        counterpart={{
          name: 'Court House',
          photo: null,
          podTitle: 'Sunday Badminton',
          when: null,
          contact: { name: null, phone: '+91 9000000001', email: null },
        }}
        venueSide={false}
        onBack={jest.fn()}
      />,
    );
    expect(screen.getByTestId('venue-chat-title')).toHaveTextContent('Court House');
    expect(screen.getByTestId('venue-chat-contact-phone')).toBeOnTheScreen();
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
