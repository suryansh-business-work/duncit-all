import { fireEvent, screen } from '@testing-library/react-native';

import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ChatMessageText } from '@/components/chat/ChatMessageText';
import { ChatMuteButton } from '@/components/chat/ChatMuteButton';
import { ChatReplyStrip } from '@/components/chat/ChatReplyStrip';
import { ChatUnreadBadge } from '@/components/chat/ChatUnreadBadge';
import { MentionSuggestionList } from '@/components/chat/MentionSuggestionList';
import { renderWithProviders } from '@/utils/test-utils';

const message = (over: Record<string, unknown> = {}) =>
  ({
    id: 'm1',
    pod_id: 'p1',
    user_id: 'u',
    user_name: 'Asha',
    user_photo: null,
    type: 'TEXT',
    text: 'hi',
    image_url: null,
    reactions: [],
    deleted: false,
    createdAt: '2026-06-09T08:05:00',
    reply_to_id: null,
    reply_to: null,
    mentions: [],
    mention_users: [],
    ...over,
  }) as never;

describe('ChatMessageText', () => {
  it('makes a recorded mention tappable to that profile and leaves other @words plain', () => {
    const onOpenProfile = jest.fn();
    renderWithProviders(
      <ChatMessageText
        text="ping @Ravi and @nobody"
        ink="$color"
        mentioned={[{ user_id: 'u2', full_name: 'Ravi Kumar' }]}
        onOpenProfile={onOpenProfile}
      />,
    );
    fireEvent.press(screen.getByTestId('chat-mention-u2'));
    expect(onOpenProfile).toHaveBeenCalledWith('u2');
    expect(screen.getByLabelText('Open the profile of Ravi Kumar')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-mention-undefined')).toBeNull();
  });
});

describe('ChatMessageBubble replies', () => {
  it('quotes the answered line and jumps to it when tapped', () => {
    const onJumpTo = jest.fn();
    renderWithProviders(
      <ChatMessageBubble
        message={message({
          reply_to_id: 'm0',
          reply_to: {
            id: 'm0',
            user_id: 'u2',
            user_name: 'Ravi',
            text: 'Meet at 7?',
            type: 'TEXT',
            deleted: false,
          },
        })}
        mine={false}
        onJumpTo={onJumpTo}
      />,
    );
    expect(screen.getByText('Meet at 7?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-quote-m0'));
    expect(onJumpTo).toHaveBeenCalledWith('m0');
  });

  it('says a removed original was deleted instead of quoting it', () => {
    renderWithProviders(
      <ChatMessageBubble
        message={message({
          reply_to: {
            id: 'm0',
            user_id: 'u2',
            user_name: 'Ravi',
            text: '',
            type: 'TEXT',
            deleted: true,
          },
        })}
        mine
      />,
    );
    expect(screen.getByText('This message was deleted')).toBeOnTheScreen();
  });
});

describe('ChatReplyStrip', () => {
  it('names the author (or You) and cancels', () => {
    const onCancel = jest.fn();
    const { rerender } = renderWithProviders(
      <ChatReplyStrip replyTo={message({ text: 'see you' })} mine={false} onCancel={onCancel} />,
    );
    expect(screen.getByText('Replying to Asha')).toBeOnTheScreen();
    expect(screen.getByText('see you')).toBeOnTheScreen();
    rerender(<ChatReplyStrip replyTo={message()} mine onCancel={onCancel} />);
    expect(screen.getByText('Replying to You')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Cancel reply'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('MentionSuggestionList', () => {
  it('lists members and reports the pick; renders nothing with none', () => {
    const onPick = jest.fn();
    const ravi = { user_id: 'u2', full_name: 'Ravi Kumar' };
    const { rerender } = renderWithProviders(
      <MentionSuggestionList members={[ravi]} onPick={onPick} />,
    );
    fireEvent.press(screen.getByTestId('chat-mention-option-u2'));
    expect(onPick).toHaveBeenCalledWith(ravi);
    rerender(<MentionSuggestionList members={[]} onPick={onPick} />);
    expect(screen.queryByTestId('chat-mention-suggestions')).toBeNull();
  });
});

describe('ChatMuteButton', () => {
  it('offers the three lengths when not muted, and reports the choice', () => {
    const onChoose = jest.fn();
    renderWithProviders(<ChatMuteButton muted={false} mutedUntil={null} onChoose={onChoose} />);
    fireEvent.press(screen.getByLabelText('Mute notifications'));
    expect(screen.getByText('8 hours')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-mute-unmute')).toBeNull();
    fireEvent.press(screen.getByTestId('chat-mute-ALWAYS'));
    expect(onChoose).toHaveBeenCalledWith('ALWAYS');
  });

  it('reads as muted and offers Unmute', () => {
    const onChoose = jest.fn();
    renderWithProviders(<ChatMuteButton muted mutedUntil={null} onChoose={onChoose} />);
    fireEvent.press(screen.getByLabelText('Notifications muted'));
    fireEvent.press(screen.getByTestId('chat-mute-unmute'));
    expect(onChoose).toHaveBeenCalledWith(null);
  });
});

describe('ChatUnreadBadge', () => {
  it('shows a capped count with a spoken label, and nothing for zero', () => {
    const { rerender } = renderWithProviders(<ChatUnreadBadge count={150} testID="b" />);
    expect(screen.getByText('99+')).toBeOnTheScreen();
    expect(screen.getByLabelText('150 unread messages')).toBeOnTheScreen();
    rerender(<ChatUnreadBadge count={0} testID="b" />);
    expect(screen.queryByTestId('b')).toBeNull();
  });
});
