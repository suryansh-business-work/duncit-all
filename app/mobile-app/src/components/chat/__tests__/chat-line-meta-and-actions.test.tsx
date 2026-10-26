import { fireEvent, screen } from '@testing-library/react-native';

import { ChatLineMeta } from '@/components/chat/ChatLineMeta';
import {
  ChatMessageActionsSheet,
  type MessageActionsTarget,
} from '@/components/chat/ChatMessageActionsSheet';
import { renderWithProviders } from '@/utils/test-utils';

const reactions = [
  { user_id: 'me', emoji: '👍' },
  { user_id: 'a', emoji: '👍' },
  { user_id: 'b', emoji: '❤️' },
];

describe('ChatLineMeta', () => {
  it('groups the reactions as one chip per emoji, picks the reader’s own and toggles them', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <ChatLineMeta
        messageId="l1"
        reactions={reactions}
        time="10:00"
        ink="$color"
        metaInk="$muted"
        viewerId="me"
        onToggleReaction={onToggle}
      />,
    );
    const mine = screen.getByTestId('reaction-l1-👍');
    expect(mine).toHaveTextContent('👍 2');
    expect(mine).toHaveProp('role', 'checkbox');
    expect(mine).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('reaction-l1-❤️')).toHaveProp('aria-checked', false);
    expect(screen.getByLabelText('👍 2, React with 👍')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reaction-l1-❤️'));
    expect(onToggle).toHaveBeenCalledWith('❤️');
    expect(screen.getByTestId('chat-line-time-l1')).toHaveTextContent('10:00');
  });

  it('only shows the counts where reacting from a chip is not offered', () => {
    renderWithProviders(
      <ChatLineMeta messageId="l1" reactions={reactions} time="" ink="$color" metaInk="$muted" />,
    );
    expect(screen.getByTestId('reaction-l1-👍')).toHaveTextContent('👍 2');
    expect(screen.getByTestId('reaction-l1-👍')).not.toHaveProp('role', 'checkbox');
    // No time and not edited: nothing at the foot.
    expect(screen.queryByTestId('chat-line-time-l1')).toBeNull();
  });

  it('marks an edited line beside its time', () => {
    renderWithProviders(
      <ChatLineMeta messageId="l1" time="10:00" edited ink="$color" metaInk="$muted" />,
    );
    expect(screen.getByTestId('chat-line-time-l1')).toHaveTextContent('10:00 · Edited');
  });
});

describe('ChatMessageActionsSheet', () => {
  const mount = (target: MessageActionsTarget, over: { canModerate?: boolean } = {}) => {
    const spies = {
      onClose: jest.fn(),
      onReact: jest.fn(),
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onReport: jest.fn(),
    };
    renderWithProviders(
      <ChatMessageActionsSheet target={target} canModerate={!!over.canModerate} {...spies} />,
    );
    return spies;
  };

  it("keeps a group room's rules when the thread names none: delete your own, report others'", () => {
    mount({ id: 'm1', mine: false });
    expect(screen.getByTestId('chat-message-action-react')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-message-action-report')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-message-action-delete')).toBeNull();
    // A group room never edits.
    expect(screen.queryByTestId('chat-message-action-edit')).toBeNull();
  });

  it("lets a moderator delete anyone's message", () => {
    mount({ id: 'm1', mine: false }, { canModerate: true });
    expect(screen.getByTestId('chat-message-action-delete')).toBeOnTheScreen();
  });

  it("follows what the thread allows on a line, and hands each pick the line's id", () => {
    const spies = mount({
      id: 'l1',
      mine: true,
      allowed: { react: true, edit: true, remove: true },
    });
    fireEvent.press(screen.getByTestId('chat-message-action-edit'));
    expect(spies.onEdit).toHaveBeenCalledWith('l1');
    expect(spies.onClose).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('chat-message-action-delete'));
    expect(spies.onDelete).toHaveBeenCalledWith('l1');
  });

  it('offers only what the thread allows — an offer card reacts and nothing else', () => {
    mount({ id: 'l2', mine: true, allowed: { react: true, edit: false, remove: false } });
    expect(screen.getByTestId('chat-message-action-react')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-message-action-edit')).toBeNull();
    expect(screen.queryByTestId('chat-message-action-delete')).toBeNull();
  });
});
