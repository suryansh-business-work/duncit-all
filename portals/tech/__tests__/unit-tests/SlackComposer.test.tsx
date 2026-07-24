import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SlackChannel } from '../../src/pages/slack/queries';

const m = vi.hoisted(() => ({ mutate: vi.fn(), loading: false }));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useMutation: () => [m.mutate, { loading: m.loading }] };
});

import SlackComposer from '../../src/pages/slack/SlackComposer';

const channels: SlackChannel[] = [
  {
    id: 'C1',
    name: 'general',
    is_private: false,
    is_member: true,
    num_members: 5,
    topic: '',
    link: 'https://x.slack.com/archives/C1',
  },
];

const typeMessage = (value: string) =>
  fireEvent.change(screen.getByLabelText('Message'), { target: { value } });

beforeEach(() => {
  m.mutate.mockReset();
  m.loading = false;
});

describe('SlackComposer', () => {
  it('disables Send until there is text or blocks', () => {
    render(<SlackComposer channels={channels} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    typeMessage('hi');
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('disables Send while a send is in flight', () => {
    m.loading = true;
    render(<SlackComposer channels={channels} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('sends text to the chosen channel and shows the returned ts', async () => {
    m.mutate.mockResolvedValue({
      data: { sendSlackMessage: { ok: true, channel: 'C1', ts: '123.45' } },
    });
    render(<SlackComposer channels={channels} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: '#general' }));
    typeMessage('hello');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Sent — ts 123.45')).toBeInTheDocument());
    expect(m.mutate).toHaveBeenCalledWith({
      variables: { input: { channel: 'C1', text: 'hello', blocks_json: undefined } },
    });
  });

  it('sends Block Kit blocks to the default channel with no ts', async () => {
    m.mutate.mockResolvedValue({
      data: { sendSlackMessage: { ok: true, channel: 'C1', ts: null } },
    });
    render(<SlackComposer channels={channels} />);
    fireEvent.change(screen.getByLabelText(/Block Kit blocks/), {
      target: { value: '[{"type":"divider"}]' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Sent — ts')).toBeInTheDocument());
    expect(m.mutate).toHaveBeenCalledWith({
      variables: {
        input: { channel: undefined, text: undefined, blocks_json: '[{"type":"divider"}]' },
      },
    });
  });

  it('handles a resolved send that carries no data payload', async () => {
    m.mutate.mockResolvedValue({});
    render(<SlackComposer channels={channels} />);
    typeMessage('x');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Sent — ts')).toBeInTheDocument());
  });

  it('shows the error message when the send throws, then dismisses it', async () => {
    m.mutate.mockRejectedValue(new Error('bad token'));
    render(<SlackComposer channels={channels} />);
    typeMessage('x');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('bad token')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('bad token')).not.toBeInTheDocument());
  });

  it('shows a default error when the send rejects with a non-Error', async () => {
    m.mutate.mockRejectedValue('boom');
    render(<SlackComposer channels={channels} />);
    typeMessage('x');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Send failed')).toBeInTheDocument();
  });
});
