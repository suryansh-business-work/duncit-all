import { fireEvent, screen } from '@testing-library/react-native';

import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { EmojiBar } from '@/components/chat/EmojiBar';
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
    ...over,
  }) as never;

describe('EmojiBar', () => {
  it('renders emojis and reports the tapped one', () => {
    const onSelect = jest.fn();
    renderWithProviders(<EmojiBar onSelect={onSelect} />);
    expect(screen.getByTestId('emoji-bar')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('emoji-👍'));
    expect(onSelect).toHaveBeenCalledWith('👍');
  });

  it('honours a custom testID', () => {
    renderWithProviders(<EmojiBar onSelect={jest.fn()} testID="react-bar" />);
    expect(screen.getByTestId('react-bar')).toBeOnTheScreen();
  });
});

describe('ChatMessageBubble', () => {
  it('shows others name, text, time and reacts on long-press', () => {
    const onReact = jest.fn();
    renderWithProviders(<ChatMessageBubble message={message()} mine={false} onReact={onReact} />);
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    expect(screen.getByText('hi')).toBeOnTheScreen();
    expect(screen.getByText('08:05')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('chat-message-m1'), 'longPress');
    expect(onReact).toHaveBeenCalledWith('m1');
  });

  it('hides the name for my messages and renders image + reactions', () => {
    renderWithProviders(
      <ChatMessageBubble
        message={message({
          user_id: 'me',
          image_url: 'http://i/x.jpg',
          text: '',
          reactions: [
            { user_id: 'a', emoji: '👍' },
            { user_id: 'b', emoji: '👍' },
          ],
        })}
        mine
      />,
    );
    expect(screen.queryByText('Asha')).toBeNull();
    expect(screen.getByTestId('reaction-m1-👍')).toBeOnTheScreen();
  });

  it('renders a deleted placeholder and ignores long-press without onReact', () => {
    renderWithProviders(<ChatMessageBubble message={message({ deleted: true })} mine={false} />);
    expect(screen.getByText('deleted')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('chat-message-m1'), 'longPress');
  });

  it('tints the deleted placeholder for my own messages', () => {
    renderWithProviders(
      <ChatMessageBubble message={message({ deleted: true, user_id: 'me' })} mine />,
    );
    expect(screen.getByText('deleted')).toBeOnTheScreen();
  });

  it('omits name and time when absent', () => {
    renderWithProviders(
      <ChatMessageBubble message={message({ user_name: null, createdAt: null })} mine={false} />,
    );
    expect(screen.queryByText('Asha')).toBeNull();
    expect(screen.queryByText('08:05')).toBeNull();
  });
});

describe('ChatComposer', () => {
  const setup = (over: Record<string, unknown> = {}) => {
    const props = {
      value: '',
      onChangeText: jest.fn(),
      onSend: jest.fn(),
      onPickImage: jest.fn(),
      onToggleEmoji: jest.fn(),
      sending: false,
      ...over,
    };
    renderWithProviders(<ChatComposer {...props} />);
    return props;
  };

  it('sends when there is text', () => {
    const props = setup({ value: 'hi' });
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(props.onSend).toHaveBeenCalled();
  });

  it('does not send when blank', () => {
    const props = setup({ value: '   ' });
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('reports text changes and toggles emoji', () => {
    const props = setup();
    fireEvent.changeText(screen.getByTestId('chat-input'), 'yo');
    expect(props.onChangeText).toHaveBeenCalledWith('yo');
    fireEvent.press(screen.getByTestId('chat-emoji-toggle'));
    expect(props.onToggleEmoji).toHaveBeenCalled();
  });

  it('picks an image when idle', () => {
    const props = setup();
    fireEvent.press(screen.getByTestId('chat-pick-image'));
    expect(props.onPickImage).toHaveBeenCalled();
  });

  it('blocks image pick while sending', () => {
    const props = setup({ sending: true });
    fireEvent.press(screen.getByTestId('chat-pick-image'));
    expect(props.onPickImage).not.toHaveBeenCalled();
  });
});
