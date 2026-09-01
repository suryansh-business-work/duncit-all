/**
 * Ask Bot — the bot list, the conversation, and the links an answer points to.
 *
 * Two rules carry the feature. The bot never writes an address: the URL arrives
 * already resolved for this environment, so a link opens localhost while
 * developing and the real console otherwise. And the thread travels back each
 * turn, so "and in the app?" still knows what "it" was — while nothing is
 * persisted, because this is a lookup, not a correspondence.
 */
import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

import { AnswerLinks } from '../src/chrome/ask-bot/AnswerLinks';
import { AskBotDialog } from '../src/chrome/ask-bot/AskBotDialog';
import { BotBubble } from '../src/chrome/ask-bot/BotBubble';
import { BotList } from '../src/chrome/ask-bot/BotList';
import { useAskBot } from '../src/chrome/ask-bot/useAskBot';
import { useBotCopy } from '../src/chrome/ask-bot/bot-copy';
import { ASK_BOTS, ASK_BOT_CHAT, type AskBotLink } from '../src/chrome/ask-bot/queries';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const bot = (over: Record<string, unknown> = {}) => ({
  __typename: 'AskBotEntry',
  key: 'navigation',
  icon: 'help',
  is_available: true,
  unavailable_reason: null,
  ...over,
});

const botsMock = (
  bots: readonly Record<string, unknown>[],
  over: Partial<MockedResponse> = {},
): MockedResponse =>
  ({
    request: { query: ASK_BOTS },
    result: { data: { askBots: bots } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    ...over,
  }) as MockedResponse;

const link = (over: Partial<AskBotLink> = {}): AskBotLink => ({
  surface_key: 'admin',
  surface_name: 'Admin',
  label: 'Approve a venue',
  path: '/venues',
  url: 'https://admin.duncit.com/venues',
  has_access: true,
  ...over,
});

const reply = (over: Record<string, unknown> = {}) => ({
  __typename: 'AskBotReply',
  answer: 'Venue approvals live in the **Admin** console.',
  links: [{ __typename: 'AskBotLink', ...link() }],
  followups: ['And in the app?'],
  ...over,
});

const chatMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
  ({
    request: { query: ASK_BOT_CHAT, variables: () => true },
    result: { data: { askBotChat: reply() } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    ...over,
  }) as MockedResponse;

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(<MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>{ui}</MockedProvider>);

describe('useBotCopy', () => {
  it('names the bot this console ships copy for', () => {
    const { result } = renderHook(() => useBotCopy());

    const copy = result.current('navigation');
    expect(copy?.name).toBe('Navigation Knowledge Bot');
    expect(copy?.starters).toHaveLength(3);
    expect(copy?.greeting).toMatch(/Ask me where anything lives/);
  });

  // A row titled with a raw key helps nobody, and shipping the copy is the same
  // one-line change as shipping the bot.
  it('answers with nothing for a bot the server offers but this console cannot name', () => {
    const { result } = renderHook(() => useBotCopy());

    expect(result.current('finance-oracle')).toBeNull();
  });
});

describe('BotList', () => {
  it('waits on the server rather than claiming there are no bots', () => {
    const { container } = wrap(<BotList onOpen={vi.fn()} />, [botsMock([bot()])]);

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it('lists the bots it has copy for, and opens the one that was picked', async () => {
    const onOpen = vi.fn();
    wrap(<BotList onOpen={onOpen} />, [botsMock([bot()])]);
    await settle();

    expect(screen.getByText('Navigation Knowledge Bot')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Navigation Knowledge Bot'));

    expect(onOpen).toHaveBeenCalledWith('navigation');
  });

  it('leaves out a bot this console has no copy for', async () => {
    wrap(<BotList onOpen={vi.fn()} />, [
      botsMock([bot(), bot({ key: 'finance-oracle' })]),
    ]);
    await settle();

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  // A row that vanished would just look broken.
  it('still lists a bot that cannot answer, with the reason', async () => {
    wrap(<BotList onOpen={vi.fn()} />, [
      botsMock([bot({ is_available: false, unavailable_reason: 'NOT_CONFIGURED' })]),
    ]);
    await settle();

    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/a tech admin needs to add the OpenAI key/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('Mui-disabled');
  });

  it('states the reason when the list could not be read', async () => {
    wrap(<BotList onOpen={vi.fn()} />, [
      botsMock([], { result: undefined, error: new Error('offline') }),
    ]);
    await settle();

    expect(screen.getByText('Could not load the bots. Please try again.')).toBeInTheDocument();
  });
});

describe('AnswerLinks', () => {
  it('renders nothing when the answer pointed nowhere', () => {
    const { container } = wrap(<AnswerLinks links={[]} />);

    expect(container.innerHTML).toBe('');
  });

  // The URL arrives already resolved, so the bot can never write the wrong one.
  it('opens the resolved address in a new tab, captioned with where it is', () => {
    wrap(<AnswerLinks links={[link()]} />);

    const button = screen.getByRole('link', { name: /Approve a venue/ });
    expect(button).toHaveAttribute('href', 'https://admin.duncit.com/venues');
    expect(button).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Admin · /venues')).toBeInTheDocument();
  });

  // Three shapes, in order of what stops you.
  it('locks a console the reader cannot open yet, and says where to ask', () => {
    wrap(<AnswerLinks links={[link({ has_access: false })]} />);

    expect(screen.getByText(/You cannot open this console yet/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says a surface with no address here has to be opened in the app', () => {
    wrap(<AnswerLinks links={[link({ url: '' })]} />);

    expect(screen.getByText(/Open this one in the Duncit app/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('BotBubble', () => {
  // Markdown renders to React elements, never to raw HTML — which matters when
  // the text came back from a language model.
  it('renders the bot answer as markdown, with its links under it', () => {
    const { container } = wrap(
      <BotBubble
        message={{
          id: 'm2',
          role: 'BOT',
          content: 'Venue approvals live in the **Admin** console.',
          links: [link()],
        }}
      />
    );

    expect(container.querySelector('strong, span')).not.toBeNull();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Approve a venue/ })).toBeInTheDocument();
  });

  it('renders the reader own question as plain text, with no links under it', () => {
    wrap(<BotBubble message={{ id: 'm1', role: 'USER', content: 'Where do I **approve** a venue?' }} />);

    expect(screen.getByText('Where do I **approve** a venue?')).toBeInTheDocument();
  });
});

describe('AskBotDialog', () => {
  const open = (mocks: readonly MockedResponse[]) => {
    const onClose = vi.fn();
    wrap(<AskBotDialog open onClose={onClose} />, mocks);
    return { onClose };
  };

  it('renders nothing at all while it is closed', () => {
    wrap(<AskBotDialog open={false} onClose={vi.fn()} />, [botsMock([bot()])]);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the bot list, with no back or restart to offer yet', async () => {
    open([botsMock([bot()])]);
    await settle();

    expect(screen.getByText('Ask Bot')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All bots' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start over' })).not.toBeInTheDocument();
  });

  // Two views in one dialog, because going back to the list is a step in the
  // same task.
  it('opens the chat on the bot that was picked, and comes back to the list', async () => {
    open([botsMock([bot()])]);
    await settle();

    fireEvent.click(screen.getByText('Navigation Knowledge Bot'));
    await settle();
    expect(screen.getByPlaceholderText('Ask where something is…')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All bots' }));
    await settle();

    expect(screen.queryByPlaceholderText('Ask where something is…')).not.toBeInTheDocument();
    expect(screen.getByText('Pick a bot to talk to. More will appear here as they are built.')).toBeInTheDocument();
  });

  it('asks the bot and shows the answer, its links and what to ask next', async () => {
    open([botsMock([bot()]), chatMock()]);
    await settle();
    fireEvent.click(screen.getByText('Navigation Knowledge Bot'));
    await settle();

    fireEvent.change(screen.getByPlaceholderText('Ask where something is…'), {
      target: { value: 'Where do I approve a venue?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await settle();
    await settle();

    expect(screen.getByText('Where do I approve a venue?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Approve a venue/ })).toBeInTheDocument();
    expect(screen.getByText('And in the app?')).toBeInTheDocument();
  });

  it('asks a suggestion straight off its chip', async () => {
    const asked: Record<string, unknown>[] = [];
    open([
      botsMock([bot()]),
      // Apollo 4 carries the matcher inside the request, and this one is here to
      // record what the bot was actually asked.
      chatMock({
        request: {
          query: ASK_BOT_CHAT,
          variables: (v: Record<string, unknown>) => {
            asked.push(v);
            return true;
          },
        },
      }),
    ]);
    await settle();
    fireEvent.click(screen.getByText('Navigation Knowledge Bot'));
    await settle();

    fireEvent.click(screen.getByText('Where do I approve a venue?'));
    await settle();
    await settle();

    expect((asked[0] as { input: { message: string } }).input.message).toBe(
      'Where do I approve a venue?'
    );
  });

  it('states a turn that failed, and lets the reader dismiss it', async () => {
    open([
      botsMock([bot()]),
      chatMock({ result: undefined, error: new Error('the model timed out') }),
    ]);
    await settle();
    fireEvent.click(screen.getByText('Navigation Knowledge Bot'));
    await settle();

    fireEvent.click(screen.getByText('Where do I approve a venue?'));
    await settle();
    await settle();
    expect(screen.getByText('Could not get an answer. Please try again.')).toBeInTheDocument();

    const [dismiss] = screen
      .getAllByRole('button', { name: 'Close' })
      .filter((button) => button.closest('[role="alert"]'));
    fireEvent.click(dismiss);
    await settle();

    expect(screen.queryByText('Could not get an answer. Please try again.')).not.toBeInTheDocument();
  });

  it('clears the thread when the reader starts over', async () => {
    open([botsMock([bot()]), chatMock()]);
    await settle();
    fireEvent.click(screen.getByText('Navigation Knowledge Bot'));
    await settle();
    fireEvent.click(screen.getByText('Where do I approve a venue?'));
    await settle();
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    await settle();

    expect(screen.queryByText('And in the app?')).not.toBeInTheDocument();
    expect(screen.getByText('Try asking')).toBeInTheDocument();
  });

  it('closes back to the list, so the next open does not resume a stale chat', async () => {
    const { onClose } = open([botsMock([bot()])]);
    await settle();
    fireEvent.click(screen.getByText('Navigation Knowledge Bot'));
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await settle();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByPlaceholderText('Ask where something is…')).not.toBeInTheDocument();
  });
});

describe('useAskBot', () => {
  const hook = (mocks: readonly MockedResponse[]) =>
    renderHook(() => useAskBot('navigation'), {
      wrapper: ({ children }) => <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>{children}</MockedProvider>,
    });

  // "and in the app?" only works because the thread so far travels with it.
  it('sends the thread as it was, with the new question beside it rather than inside it', async () => {
    const asked: Record<string, unknown>[] = [];
    const { result } = hook([
      chatMock({
        request: {
          query: ASK_BOT_CHAT,
          variables: (v: Record<string, unknown>) => {
            asked.push(v);
            return true;
          },
        },
      }),
    ]);

    await act(async () => result.current.send('Where do I approve a venue?'));
    await settle();
    await act(async () => result.current.send('And in the app?'));
    await settle();

    const second = asked[1] as { input: { message: string; history: unknown[] } };
    expect(second.input.message).toBe('And in the app?');
    expect(second.input.history).toHaveLength(2);
  });

  it('sends nothing for a blank question', async () => {
    const asked = vi.fn();
    const { result } = hook([chatMock({})]);

    await act(async () => result.current.send('   '));
    await settle();

    expect(asked).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  // A failed turn leaves the question in the thread, so lengths repeat — a
  // length-derived id would collide.
  it('gives every turn its own id, even across a failure', async () => {
    const { result } = hook([
      chatMock({ result: undefined, error: new Error('timeout'), maxUsageCount: 1 }),
      chatMock(),
    ]);

    await act(async () => result.current.send('one'));
    await settle();
    await act(async () => result.current.send('two'));
    await settle();

    const ids = result.current.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports a turn the server answered with nothing', async () => {
    const { result } = hook([chatMock({ result: { data: { askBotChat: null } } })]);

    await act(async () => result.current.send('where?'));
    await settle();

    expect(result.current.error).toBe(true);
  });

  it('drops the error once the reader has seen it', async () => {
    const { result } = hook([chatMock({ result: { data: { askBotChat: null } } })]);
    await act(async () => result.current.send('where?'));
    await settle();

    act(() => result.current.dismissError());

    expect(result.current.error).toBe(false);
  });

  it('forgets the whole conversation on restart', async () => {
    const { result } = hook([chatMock()]);
    await act(async () => result.current.send('where?'));
    await settle();
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => result.current.restart());

    expect(result.current.messages).toEqual([]);
    expect(result.current.followups).toEqual([]);
    expect(result.current.error).toBe(false);
  });
});
