import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SLACK_CHANNELS, type SlackChannel } from '../../src/pages/slack/queries';

type QueryResult = {
  loading: boolean;
  data: unknown;
  error?: Error;
  refetch?: () => Promise<unknown>;
};

const m = vi.hoisted(() => ({
  configured: { loading: false, data: undefined as unknown } as QueryResult,
  channels: { loading: false, data: undefined as unknown, error: undefined } as QueryResult,
  channelsOptions: undefined as { skip?: boolean } | undefined,
  refetch: vi.fn(),
}));

vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: (doc: unknown, options?: { skip?: boolean }) => {
      if (doc !== SLACK_CHANNELS) return m.configured;
      m.channelsOptions = options;
      return { ...m.channels, refetch: m.refetch };
    },
  };
});

// The conversation pane and the permissions popover own their own queries and
// have their own suites; here they only need to show what the page hands them.
vi.mock('../../src/pages/slack/ConversationPane', () => ({
  default: (p: { channel: SlackChannel | null; onChannelsChanged: () => void }) => (
    <div data-testid="pane">
      pane:{p.channel?.id ?? 'none'}
      <button type="button" onClick={p.onChannelsChanged}>
        joined
      </button>
    </div>
  ),
}));
vi.mock('../../src/pages/slack/SlackPermissionsButton', () => ({
  default: () => <div data-testid="permissions" />,
}));

import SlackSettingsPage from '../../src/pages/slack/SlackSettingsPage';

const rows: SlackChannel[] = [
  {
    id: 'C1',
    name: 'general',
    is_private: false,
    is_member: false,
    num_members: 5,
    topic: 'daily standup',
    link: 'https://x.slack.com/archives/C1',
  },
  {
    id: 'C2',
    name: 'random',
    is_private: true,
    is_member: true,
    num_members: 2,
    topic: '',
    link: '',
  },
];

const channelRows = () => screen.getAllByTestId('slack-channel-row');

beforeEach(() => {
  m.refetch.mockReset().mockResolvedValue(undefined);
  m.channelsOptions = undefined;
  m.configured = { loading: false, data: { slackConfigured: true } };
  m.channels = { loading: false, data: { slackChannels: [] }, error: undefined };
});

describe('SlackSettingsPage', () => {
  it('shows a spinner while the configured probe is loading', () => {
    m.configured = { loading: true, data: undefined };
    render(<SlackSettingsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Slack' })).not.toBeInTheDocument();
  });

  it('prompts to add a bot token and skips the channel read when Slack is not configured', () => {
    m.configured = { loading: false, data: { slackConfigured: false } };
    render(<SlackSettingsPage />);
    expect(screen.getByRole('heading', { name: 'Slack' })).toBeInTheDocument();
    expect(screen.getByText(/Add a Slack bot token/)).toBeInTheDocument();
    expect(m.channelsOptions?.skip).toBe(true);
    expect(screen.queryByTestId('permissions')).not.toBeInTheDocument();
  });

  it('reads channels once configured and shows the permissions answer', () => {
    render(<SlackSettingsPage />);
    expect(m.channelsOptions?.skip).toBe(false);
    expect(screen.getByTestId('permissions')).toBeInTheDocument();
  });

  it('shows a spinner while channels load', () => {
    m.channels = { loading: true, data: undefined, error: undefined };
    render(<SlackSettingsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(/No channels the bot can see yet/)).not.toBeInTheDocument();
  });

  it('invites the user to add the bot when it can see no channels', () => {
    render(<SlackSettingsPage />);
    expect(screen.getByText(/No channels the bot can see yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('pane')).not.toBeInTheDocument();
  });

  it('surfaces a channels load error instead of the empty hint', () => {
    m.channels = { loading: false, data: undefined, error: new Error('rate limited') };
    render(<SlackSettingsPage />);
    expect(screen.getByText('rate limited')).toBeInTheDocument();
    expect(screen.queryByText(/No channels the bot can see yet/)).not.toBeInTheDocument();
  });

  it('opens on the first channel the bot belongs to and switches on a row click', () => {
    m.channels = { loading: false, data: { slackChannels: rows }, error: undefined };
    render(<SlackSettingsPage />);
    expect(screen.getByTestId('pane')).toHaveTextContent('pane:C2');

    const [general, random] = channelRows();
    expect(random).toHaveAttribute('aria-current', 'true');
    expect(within(general).getByText('general')).toBeInTheDocument();
    expect(within(general).getByText('daily standup')).toBeInTheDocument();
    expect(within(general).getByText('Not joined')).toBeInTheDocument();
    expect(within(random).queryByText('Not joined')).not.toBeInTheDocument();

    fireEvent.click(general);
    expect(screen.getByTestId('pane')).toHaveTextContent('pane:C1');
    expect(general).toHaveAttribute('aria-current', 'true');
  });

  it('falls back to the first channel when the bot belongs to none', () => {
    m.channels = {
      loading: false,
      data: { slackChannels: rows.map((c) => ({ ...c, is_member: false })) },
      error: undefined,
    };
    render(<SlackSettingsPage />);
    expect(screen.getByTestId('pane')).toHaveTextContent('pane:C1');
  });

  it('filters channels by name or topic and says when nothing matches', () => {
    m.channels = { loading: false, data: { slackChannels: rows }, error: undefined };
    render(<SlackSettingsPage />);
    const search = screen.getByLabelText('Search channels');

    fireEvent.change(search, { target: { value: 'STANDUP' } });
    expect(channelRows()).toHaveLength(1);
    expect(screen.getByText('general')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'nope' } });
    expect(screen.queryAllByTestId('slack-channel-row')).toHaveLength(0);
    expect(screen.getByText('No channel matches that search.')).toBeInTheDocument();
  });

  it('re-reads the channel list when the pane reports a channel change', () => {
    m.channels = { loading: false, data: { slackChannels: rows }, error: undefined };
    render(<SlackSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'joined' }));
    expect(m.refetch).toHaveBeenCalledTimes(1);
  });
});
