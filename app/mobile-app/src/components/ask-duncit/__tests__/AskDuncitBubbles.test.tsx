import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import type { AskDuncitActionView, AskDuncitMessageView } from '@duncit/utils';

import { AskActionCard } from '@/components/ask-duncit/AskActionCard';
import { AskMarkdown } from '@/components/ask-duncit/AskMarkdown';
import { AskMessageBubble } from '@/components/ask-duncit/AskMessageBubble';
import { renderWithProviders } from '@/utils/test-utils';

/** The native twins of mWeb's ActionCard / MarkdownView / MessageBubble tests. */

const action = (over: Partial<AskDuncitActionView> = {}): AskDuncitActionView => ({
  id: 'a1',
  tool: 'pods_follow_pod',
  tool_title: 'Follow pod',
  risk: 'WRITE',
  args_preview: '{"pod_id":"p1"}',
  status: 'PENDING',
  error_message: '',
  can_rollback: false,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  ...over,
});

const message = (over: Partial<AskDuncitMessageView> = {}): AskDuncitMessageView => ({
  id: 'm1',
  role: 'assistant',
  content: 'Hello **there**',
  status: 'COMPLETE',
  attachments: [],
  tool_calls: [],
  actions: [],
  created_at: '2026-11-22T10:00:00.000Z',
  ...over,
});

const handlers = () => ({
  onDecide: jest.fn(),
  onRollback: jest.fn(),
  onRate: jest.fn(),
  onSpeak: jest.fn(),
});

describe('AskActionCard', () => {
  it('approves or rejects a pending change', () => {
    const onDecide = jest.fn();
    renderWithProviders(
      <AskActionCard action={action()} canRollback onDecide={onDecide} onRollback={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('ask-duncit-approve'));
    fireEvent.press(screen.getByTestId('ask-duncit-reject'));
    expect(onDecide.mock.calls).toEqual([
      ['a1', true],
      ['a1', false],
    ]);
  });

  it('offers undo only for an executed change that can be undone, and no decision once expired', () => {
    const onRollback = jest.fn();
    const expired = renderWithProviders(
      <AskActionCard
        action={action({ expires_at: new Date(Date.now() - 1).toISOString() })}
        canRollback
        onDecide={jest.fn()}
        onRollback={onRollback}
      />,
    );
    expect(screen.queryByTestId('ask-duncit-approve')).toBeNull();
    expired.unmount();
    renderWithProviders(
      <AskActionCard
        action={action({ status: 'EXECUTED', can_rollback: true })}
        canRollback
        onDecide={jest.fn()}
        onRollback={onRollback}
      />,
    );
    fireEvent.press(screen.getByTestId('ask-duncit-undo'));
    expect(onRollback).toHaveBeenCalledWith('a1');
  });
});

describe('AskMarkdown', () => {
  it('renders list items and opens only http(s) links', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(
      <AskMarkdown
        text={'- one\n- [Help](https://duncit.com/help)\n\n[bad](javascript:alert(1))'}
      />,
    );
    expect(screen.getByText('one')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Help'));
    expect(open).toHaveBeenCalledWith('https://duncit.com/help');
    expect(screen.getByText(/\[bad\]\(javascript:alert\(1\)/)).toBeOnTheScreen();
    open.mockRestore();
  });
});

describe('AskMessageBubble', () => {
  it('shows the localized reason for a blocked message, with no rating buttons', () => {
    renderWithProviders(
      <AskMessageBubble
        message={message({ content: '', error_code: 'INJECTION_BLOCKED' })}
        canRollback
        voice={false}
        speaking={false}
        {...handlers()}
      />,
    );
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Helpful')).toBeNull();
  });

  it('rates a finished answer and reads it aloud when voice is on', () => {
    const h = handlers();
    renderWithProviders(
      <AskMessageBubble message={message()} canRollback voice speaking={false} {...h} />,
    );
    fireEvent.press(screen.getByLabelText('Not helpful'));
    fireEvent.press(screen.getByLabelText('Read aloud'));
    expect(h.onRate).toHaveBeenCalledWith('m1', 'DOWN');
    expect(h.onSpeak).toHaveBeenCalledWith('m1', 'Hello **there**');
  });

  it('hides the internal tool lookups and shows the real tool with its status', () => {
    renderWithProviders(
      <AskMessageBubble
        message={message({
          tool_calls: [
            { name: 'find_tools', title: 'find_tools', status: 'OK' },
            { name: 'pods_my_pods', title: 'My pods', status: 'OK' },
          ],
        })}
        canRollback
        voice={false}
        speaking={false}
        {...handlers()}
      />,
    );
    expect(screen.getByText(/My pods/)).toBeOnTheScreen();
    expect(screen.queryByText(/find_tools/)).toBeNull();
  });
});
