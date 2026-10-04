import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({ mutate: vi.fn(), loading: false, notifyError: vi.fn() }));
vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return { ...actual, useMutation: () => [m.mutate, { loading: m.loading }] };
});
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifyError: m.notifyError,
}));

import SlackComposer from '../../src/pages/slack/SlackComposer';

const PLACEHOLDER = 'Message the channel — Enter sends, Shift+Enter for a new line';

const input = () => screen.getByTestId('slack-composer-input');
const sendButton = () => screen.getByRole('button', { name: 'Send' });
const typeMessage = (value: string) => fireEvent.change(input(), { target: { value } });

const renderComposer = (channelId = 'C1') => {
  const onSent = vi.fn();
  render(<SlackComposer channelId={channelId} onSent={onSent} />);
  return onSent;
};

beforeEach(() => {
  m.mutate.mockReset();
  m.notifyError.mockReset();
  m.loading = false;
});

describe('SlackComposer', () => {
  it('labels the message box with its placeholder for screen readers', () => {
    renderComposer();
    expect(screen.getByLabelText(PLACEHOLDER)).toBe(input());
  });

  it('disables Send until there is non-blank text', () => {
    renderComposer();
    expect(sendButton()).toBeDisabled();
    typeMessage('   ');
    expect(sendButton()).toBeDisabled();
    typeMessage('hi');
    expect(sendButton()).toBeEnabled();
  });

  it('disables Send when no channel is selected', () => {
    renderComposer('');
    typeMessage('hi');
    expect(sendButton()).toBeDisabled();
  });

  it('disables Send while a send is in flight', () => {
    m.loading = true;
    renderComposer();
    typeMessage('hi');
    expect(sendButton()).toBeDisabled();
  });

  it('sends trimmed text to the channel, clears the box and reports it sent', async () => {
    m.mutate.mockResolvedValue({ data: { sendSlackMessage: { ok: true } } });
    const onSent = renderComposer();
    typeMessage('  hello  ');
    fireEvent.click(sendButton());
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(m.mutate).toHaveBeenCalledWith({
      variables: { input: { channel: 'C1', text: 'hello', blocks_json: undefined } },
    });
    expect(input()).toHaveValue('');
  });

  it('sends on Enter but treats Shift+Enter as a newline', async () => {
    m.mutate.mockResolvedValue({});
    const onSent = renderComposer();
    typeMessage('hello');
    fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true });
    expect(m.mutate).not.toHaveBeenCalled();
    fireEvent.keyDown(input(), { key: 'Enter' });
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(m.mutate).toHaveBeenCalledTimes(1);
  });

  it('ignores Enter when there is nothing to send', () => {
    renderComposer();
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(m.mutate).not.toHaveBeenCalled();
  });

  it('reveals the Block Kit field behind the toggle and sends blocks alone', async () => {
    m.mutate.mockResolvedValue({});
    const onSent = renderComposer();
    const toggle = screen.getByRole('button', { name: 'Block Kit payload' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText(/Block Kit blocks/)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText(/Block Kit blocks/), {
      target: { value: '[{"type":"divider"}]' },
    });
    fireEvent.click(sendButton());
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(m.mutate).toHaveBeenCalledWith({
      variables: {
        input: { channel: 'C1', text: undefined, blocks_json: '[{"type":"divider"}]' },
      },
    });
  });

  it('surfaces the server error and keeps the draft when the send throws', async () => {
    m.mutate.mockRejectedValue(new Error('missing_scope: chat:write'));
    const onSent = renderComposer();
    typeMessage('x');
    fireEvent.click(sendButton());
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('missing_scope: chat:write'));
    expect(onSent).not.toHaveBeenCalled();
    expect(input()).toHaveValue('x');
  });

  it('stringifies a non-Error rejection for the notification', async () => {
    m.mutate.mockRejectedValue('boom');
    renderComposer();
    typeMessage('x');
    fireEvent.click(sendButton());
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('boom'));
  });
});
