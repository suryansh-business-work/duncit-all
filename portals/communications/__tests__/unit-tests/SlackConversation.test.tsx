import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlackChannel, SlackMessage } from '../../src/pages/slack/queries';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  history: undefined as unknown,
  loading: false,
  error: undefined as unknown,
  refetch: vi.fn(),
  permissions: undefined as unknown,
  permissionsLoading: false,
  join: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  lastQueryOptions: undefined as unknown as Record<string, unknown>,
}));
const opName = (doc: { definitions: Array<{ name?: { value: string } }> }) =>
  doc.definitions[0].name?.value ?? '';
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (doc: Parameters<typeof opName>[0], options: Record<string, unknown>) => {
    if (/Permission/i.test(opName(doc))) {
      m.lastQueryOptions = options;
      return { data: m.permissions, loading: m.permissionsLoading };
    }
    return { data: m.history, loading: m.loading, error: m.error, refetch: m.refetch };
  },
  useMutation: () => [m.join, {}] as const,
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifyError: m.notifyError,
  notifySuccess: m.notifySuccess,
}));
vi.mock('../../src/pages/slack/SlackComposer', () => ({
  default: (p: { channelId: string; onSent: () => void }) => (
    <button type="button" onClick={p.onSent}>
      composer:{p.channelId}
    </button>
  ),
}));

import ConversationPane from '../../src/pages/slack/ConversationPane';
import SlackPermissionsButton from '../../src/pages/slack/SlackPermissionsButton';
import { slackErrorCode } from '../../src/pages/slack/queries';

const channel = (over: Partial<SlackChannel> = {}): SlackChannel => ({
  id: 'C1',
  name: 'ops-alerts',
  is_private: false,
  is_member: true,
  num_members: 12,
  topic: 'Pager noise',
  link: 'https://slack.example.test/C1',
  ...over,
});

const message = (ts: string, over: Partial<SlackMessage> = {}): SlackMessage => ({
  ts,
  user_name: 'asha',
  avatar: '',
  text: 'deploy done',
  is_bot: false,
  reply_count: 0,
  ...over,
});

beforeEach(() => {
  m.history = { slackChannelHistory: [] };
  m.loading = false;
  m.error = undefined;
  m.refetch.mockReset().mockResolvedValue({});
  m.join.mockReset().mockResolvedValue({});
  m.notifyError.mockReset();
  m.notifySuccess.mockReset();
  m.permissions = undefined;
  m.permissionsLoading = false;
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ConversationPane', () => {
  const mount = (ch: SlackChannel | null, onChannelsChanged = vi.fn()) => {
    renderWithProviders(<ConversationPane channel={ch} onChannelsChanged={onChannelsChanged} />);
    return { onChannelsChanged };
  };

  it('asks to pick a channel when none is selected', () => {
    mount(null);
    expect(screen.getByText(/pick|choose|select/i)).toBeInTheDocument();
    expect(screen.queryByText(/composer:/)).not.toBeInTheDocument();
  });

  it('shows the channel identity, its topic and a composer', () => {
    mount(channel());
    expect(screen.getByText('ops-alerts')).toBeInTheDocument();
    expect(screen.getByText(/Pager noise/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'composer:C1' })).toBeInTheDocument();
  });

  it('groups messages by day with one divider per day, flags bots and replies', () => {
    const day1 = String(Date.UTC(2026, 7, 5, 10) / 1000);
    const day1b = String(Date.UTC(2026, 7, 5, 11) / 1000);
    const day2 = String(Date.UTC(2026, 7, 6, 10) / 1000);
    m.history = {
      slackChannelHistory: [
        message(day1, { text: 'first' }),
        message(day1b, { text: 'second', is_bot: true, user_name: 'deploybot', reply_count: 3 }),
        message(day2, { text: 'third', avatar: 'https://cdn.example.test/a.png' }),
      ],
    };
    const { container } = renderWithProviders(
      <ConversationPane channel={channel()} onChannelsChanged={vi.fn()} />
    );
    expect(screen.getAllByText('first').length).toBeGreaterThan(0);
    expect(screen.getAllByText('second').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.MuiDivider-root').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('deploybot')).toBeInTheDocument();
  });

  it('shows the empty state for a channel with no messages', () => {
    mount(channel());
    expect(screen.getAllByText(/no messages|nothing/i).length).toBeGreaterThan(0);
  });

  it('shows a spinner on the first load', () => {
    m.history = undefined;
    m.loading = true;
    mount(channel());
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows a plain error that is not a membership problem', () => {
    m.error = new Error('Slack is down');
    mount(channel());
    expect(screen.getByText('Slack is down')).toBeInTheDocument();
  });

  it('offers Join for a public channel the bot is not in, then refreshes both lists', async () => {
    const { onChannelsChanged } = mount(channel({ is_member: false }));
    fireEvent.click(screen.getByRole('button', { name: /add the bot/i }));
    await waitFor(() => expect(m.join).toHaveBeenCalledWith({ variables: { channel: 'C1' } }));
    await waitFor(() => expect(onChannelsChanged).toHaveBeenCalled());
    expect(m.refetch).toHaveBeenCalled();
  });

  it('explains how to invite the bot to a private channel instead of offering Join', () => {
    mount(channel({ is_member: false, is_private: true }));
    expect(screen.getByText(/ops-alerts/, { selector: '.MuiAlert-message' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add the bot/i })).not.toBeInTheDocument();
  });

  it('treats a not_in_channel refusal like a missing membership', () => {
    m.error = Object.assign(new Error('not_in_channel'), {
      graphQLErrors: [{ extensions: { slack_error: 'not_in_channel' } }],
    });
    mount(channel());
    expect(screen.getByRole('button', { name: /add the bot/i })).toBeInTheDocument();
    expect(screen.queryByText('not_in_channel')).not.toBeInTheDocument();
  });

  it('shows the join failure with Slack own message', async () => {
    m.join.mockRejectedValue(new Error('missing_scope: channels:join'));
    mount(channel({ is_member: false }));
    fireEvent.click(screen.getByRole('button', { name: /add the bot/i }));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('missing_scope: channels:join'));
  });

  it('refreshes the history after a message is sent', () => {
    mount(channel());
    fireEvent.click(screen.getByRole('button', { name: 'composer:C1' }));
    expect(m.refetch).toHaveBeenCalled();
  });
});

describe('slackErrorCode', () => {
  it('reads Slack own code from the error extensions', () => {
    expect(slackErrorCode({ graphQLErrors: [{ extensions: { slack_error: 'ratelimited' } }] })).toBe(
      'ratelimited'
    );
  });

  it('is empty for anything else', () => {
    expect(slackErrorCode(undefined)).toBe('');
    expect(slackErrorCode(new Error('x'))).toBe('');
    expect(slackErrorCode({ graphQLErrors: [{ extensions: { slack_error: 5 } }] })).toBe('');
  });
});

describe('ConversationHeader actions', () => {
  it('copies the channel id and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderWithProviders(<ConversationPane channel={channel()} onChannelsChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('C1'));
    await waitFor(() => expect(m.notifySuccess).toHaveBeenCalled());
  });

  it('links to the channel in Slack, and disables the link when there is none', () => {
    const first = renderWithProviders(
      <ConversationPane channel={channel()} onChannelsChanged={vi.fn()} />
    );
    expect(screen.getByRole('link', { name: /open in slack/i })).toHaveAttribute(
      'href',
      'https://slack.example.test/C1'
    );
    first.unmount();
    renderWithProviders(
      <ConversationPane channel={channel({ link: '', is_private: true })} onChannelsChanged={vi.fn()} />
    );
    expect(screen.queryByRole('link', { name: /open in slack/i })).not.toBeInTheDocument();
  });
});

describe('SlackPermissionsButton', () => {
  const scope = (name: string, granted: boolean, required = true) => ({
    scope: name,
    granted,
    required,
    purpose: `needed for ${name}`,
  });
  const perms = (over: Record<string, unknown> = {}) => ({
    slackPermissions: {
      configured: true,
      team: 'Duncit',
      error: '',
      scopes_known: true,
      scopes: [scope('chat:write', true), scope('channels:join', false, false)],
      app_url: 'https://api.slack.example.test/apps',
      docs_url: 'https://api.slack.example.test/scopes',
      ...over,
    },
  });
  const open = () => fireEvent.click(screen.getByTestId('slack-permissions-open'));

  it('reads nothing until it is opened', () => {
    renderWithProviders(<SlackPermissionsButton />);
    expect(m.lastQueryOptions.skip).toBe(true);
    open();
    expect(m.lastQueryOptions.skip).toBe(false);
  });

  it('shows granted and missing scopes with optional ones marked', async () => {
    m.permissions = perms();
    renderWithProviders(<SlackPermissionsButton />);
    open();
    const popover = await screen.findByRole('presentation');
    expect(within(popover).getByText('chat:write')).toBeInTheDocument();
    expect(within(popover).getByText('channels:join')).toBeInTheDocument();
    expect(within(popover).getAllByRole('img', { hidden: true }).length).toBeGreaterThanOrEqual(2);
    expect(within(popover).getAllByRole('link')).toHaveLength(2);
  });

  it('says when the token does not report its scopes, instead of marking everything missing', async () => {
    m.permissions = perms({ scopes_known: false });
    renderWithProviders(<SlackPermissionsButton />);
    open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows Slack own error and a not-configured warning', async () => {
    m.permissions = perms({ error: 'invalid_auth' });
    const first = renderWithProviders(<SlackPermissionsButton />);
    open();
    expect(await screen.findByText('invalid_auth')).toBeInTheDocument();
    first.unmount();

    m.permissions = perms({ configured: false });
    renderWithProviders(<SlackPermissionsButton />);
    open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows a spinner while the first answer loads', async () => {
    m.permissionsLoading = true;
    renderWithProviders(<SlackPermissionsButton />);
    open();
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });
});
