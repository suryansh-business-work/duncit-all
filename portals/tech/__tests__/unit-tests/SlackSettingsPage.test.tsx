import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SlackChannel } from '../../src/pages/slack/queries';
import { flush } from '../testkit';

type QueryResult = { loading: boolean; data: unknown; error?: Error };

const m = vi.hoisted(() => ({
  configured: { loading: false, data: undefined as unknown } as QueryResult,
  channels: { loading: false, data: undefined as unknown, error: undefined } as QueryResult,
}));

vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: (doc: { definitions: { name?: { value: string } }[] }) =>
      doc.definitions[0]?.name?.value === 'SlackChannels' ? m.channels : m.configured,
  };
});

vi.mock('../../src/pages/slack/SlackComposer', () => ({
  default: (p: { channels: SlackChannel[] }) => (
    <div data-testid="composer">composer:{p.channels.length}</div>
  ),
}));

import SlackSettingsPage from '../../src/pages/slack/SlackSettingsPage';

const rows: SlackChannel[] = [
  {
    id: 'C1',
    name: 'general',
    is_private: true,
    is_member: true,
    num_members: 5,
    topic: 'daily',
    link: 'https://x.slack.com/archives/C1',
  },
  {
    id: 'C2',
    name: 'random',
    is_private: false,
    is_member: false,
    num_members: 2,
    topic: '',
    link: '',
  },
];

let writeText: ReturnType<typeof vi.fn>;
const setClipboard = (value: { writeText: unknown } | undefined) => {
  Object.defineProperty(globalThis.navigator, 'clipboard', { value, configurable: true });
};

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
  m.configured = { loading: false, data: { slackConfigured: true } };
  m.channels = { loading: false, data: { slackChannels: [] }, error: undefined };
});

describe('SlackSettingsPage', () => {
  it('shows a spinner while the configured probe is loading', () => {
    m.configured = { loading: true, data: undefined };
    render(<SlackSettingsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('prompts to add a bot token when Slack is not configured', () => {
    m.configured = { loading: false, data: { slackConfigured: false } };
    render(<SlackSettingsPage />);
    expect(screen.getByText(/Add a Slack bot token/)).toBeInTheDocument();
  });

  it('shows a spinner while channels load', () => {
    m.channels = { loading: true, data: undefined, error: undefined };
    render(<SlackSettingsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('invites the user to add the bot when it can see no channels', () => {
    render(<SlackSettingsPage />);
    expect(screen.getByText(/No channels the bot can see yet/)).toBeInTheDocument();
    expect(screen.getByTestId('composer')).toHaveTextContent('composer:0');
  });

  it('surfaces a channels load error', () => {
    m.channels = { loading: false, data: undefined, error: new Error('rate limited') };
    render(<SlackSettingsPage />);
    expect(screen.getByText('rate limited')).toBeInTheDocument();
  });

  it('lists channels and copies id then link to the clipboard', async () => {
    m.channels = { loading: false, data: { slackChannels: rows }, error: undefined };
    render(<SlackSettingsPage />);
    expect(screen.getByText('#general')).toBeInTheDocument();
    expect(screen.getByText(/C1 · 5 members · daily/)).toBeInTheDocument();
    expect(screen.getByText('private')).toBeInTheDocument();
    expect(screen.getByText('joined')).toBeInTheDocument();
    expect(screen.getByText('#random')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy random link')).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Copy general ID'));
    await waitFor(() => expect(screen.getByText('Copied channel ID')).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith('C1');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByText('Copied channel ID')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByLabelText('Copy general link'));
    await waitFor(() => expect(screen.getByText('Copied channel link')).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith('https://x.slack.com/archives/C1');
  });

  it('swallows a clipboard write rejection', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    m.channels = { loading: false, data: { slackChannels: rows }, error: undefined };
    render(<SlackSettingsPage />);
    fireEvent.click(screen.getByLabelText('Copy general ID'));
    await flush();
    expect(screen.queryByText(/Copied/)).not.toBeInTheDocument();
  });

  it('does nothing when the clipboard API is unavailable', async () => {
    setClipboard(undefined);
    m.channels = { loading: false, data: { slackChannels: rows }, error: undefined };
    render(<SlackSettingsPage />);
    fireEvent.click(screen.getByLabelText('Copy general ID'));
    await flush();
    expect(screen.queryByText(/Copied/)).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });
});
