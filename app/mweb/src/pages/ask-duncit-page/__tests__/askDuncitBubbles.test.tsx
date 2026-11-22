import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ActionCard from '../ActionCard';
import MarkdownView from '../MarkdownView';
import MessageBubble from '../MessageBubble';
import { fallbackT } from '../../../i18n/fallback';
import type { Action, Message } from '../queries';

const action = (over: Partial<Action> = {}): Action => ({
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

const message = (over: Partial<Message> = {}): Message => ({
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

const handlers = () => ({ onDecide: vi.fn(), onRollback: vi.fn(), onRate: vi.fn(), onSpeak: vi.fn() });

describe('ActionCard', () => {
  it('approves or rejects a pending change, and shows what will run', () => {
    const onDecide = vi.fn();
    render(<ActionCard action={action()} canRollback onDecide={onDecide} onRollback={vi.fn()} />);
    expect(screen.getByText('{"pod_id":"p1"}')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ask-duncit-approve'));
    fireEvent.click(screen.getByTestId('ask-duncit-reject'));
    expect(onDecide.mock.calls).toEqual([
      ['a1', true],
      ['a1', false],
    ]);
  });

  it('offers no decision on an expired or executed change, and undo only when it is possible', () => {
    const onRollback = vi.fn();
    const { rerender } = render(<ActionCard action={action({ expires_at: new Date(Date.now() - 1).toISOString() })} canRollback onDecide={vi.fn()} onRollback={onRollback} />);
    expect(screen.queryByTestId('ask-duncit-approve')).not.toBeInTheDocument();
    rerender(<ActionCard action={action({ status: 'EXECUTED', can_rollback: true })} canRollback onDecide={vi.fn()} onRollback={onRollback} />);
    fireEvent.click(screen.getByTestId('ask-duncit-undo'));
    expect(onRollback).toHaveBeenCalledWith('a1');
    rerender(<ActionCard action={action({ status: 'EXECUTED', can_rollback: true })} canRollback={false} onDecide={vi.fn()} onRollback={onRollback} />);
    expect(screen.queryByTestId('ask-duncit-undo')).not.toBeInTheDocument();
  });

  it('warns that a destructive change removes or cancels something', () => {
    render(<ActionCard action={action({ risk: 'DESTRUCTIVE' })} canRollback onDecide={vi.fn()} onRollback={vi.fn()} />);
    expect(screen.getByText(fallbackT('askDuncit.action.destructiveHint'))).toBeInTheDocument();
  });
});

describe('MarkdownView', () => {
  it('renders emphasis and lists, keeps a safe link and never renders HTML', () => {
    const { container } = render(<MarkdownView text={'**Bold** <img src=x onerror=alert(1)>\n\n- one\n- [two](https://duncit.com)'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Bold')).toHaveStyle({ fontWeight: '700' });
    expect(screen.getByRole('link', { name: 'two' })).toHaveAttribute('href', 'https://duncit.com');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });
});

describe('MessageBubble', () => {
  it('shows the localized reason when the message was blocked, with no feedback buttons', () => {
    const h = handlers();
    render(<MessageBubble message={message({ content: '', error_code: 'INJECTION_BLOCKED' })} canRollback voice={false} speaking={false} {...h} />);
    expect(screen.getByRole('alert')).toHaveTextContent(fallbackT('askDuncit.errors.INJECTION_BLOCKED'));
    expect(screen.queryByLabelText(fallbackT('askDuncit.feedback.up'))).not.toBeInTheDocument();
  });

  it('rates a finished answer and reads it aloud when voice is on', () => {
    const h = handlers();
    render(<MessageBubble message={message()} canRollback voice speaking={false} {...h} />);
    fireEvent.click(screen.getByLabelText(fallbackT('askDuncit.feedback.down')));
    fireEvent.click(screen.getByLabelText(fallbackT('askDuncit.voice.readAloud')));
    expect(h.onRate).toHaveBeenCalledWith('m1', 'DOWN');
    expect(h.onSpeak).toHaveBeenCalledWith('m1', 'Hello **there**');
  });

  it('shows a thinking line while streaming with no text yet, and hides internal tool lookups', () => {
    const h = handlers();
    render(
      <MessageBubble
        message={message({ content: '', status: 'STREAMING', tool_calls: [{ name: 'find_tools', title: 'find_tools', status: 'OK' }, { name: 'pods_my_pods', title: 'My pods', status: 'OK' }] })}
        canRollback
        voice={false}
        speaking={false}
        {...h}
      />
    );
    expect(screen.getByText(fallbackT('askDuncit.thinking'))).toBeInTheDocument();
    expect(screen.getByText(/My pods/)).toBeInTheDocument();
    expect(screen.queryByText(/find_tools/)).not.toBeInTheDocument();
  });
});
