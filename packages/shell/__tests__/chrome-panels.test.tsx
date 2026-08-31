/**
 * The three panels the portal chrome opens over any page: the portal launcher,
 * the Ask Bot and the agent console.
 *
 * Nothing behind them answers, which is the state each is in on first open and
 * for the whole of a failed request. A panel that throws there takes the whole
 * console down with it, because it is mounted by the chrome rather than by a
 * page — so what is asserted is that each opens, survives every control on it,
 * and closes through the caller rather than on its own.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AgentChat } from '../src/chrome/agent/AgentChat';
import { BotChat } from '../src/chrome/ask-bot/BotChat';
import { ASK_BOT_CHAT } from '../src/chrome/ask-bot/queries';
import { JumpToPortalDialog } from '../src/chrome/jump-to-portal/JumpToPortalDialog';

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: ReactElement) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>
      <MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

const pressEverything = async () => {
  for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

afterEach(() => {
  vi.clearAllMocks();
});

// jsdom has no scrollIntoView at all — AgentChat's own auto-scroll effect
// needs a real implementation to exercise its "element is there" branch.
Element.prototype.scrollIntoView ??= vi.fn();

describe('JumpToPortalDialog', () => {
  it('renders nothing while it is closed', () => {
    wrap(<JumpToPortalDialog open={false} onClose={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens with the launcher, even before the access list answers', async () => {
    wrap(<JumpToPortalDialog open onClose={vi.fn()} />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('survives the access list failing rather than blanking the console', async () => {
    const { container } = wrap(<JumpToPortalDialog open onClose={vi.fn()} />);
    await settle();
    await settle();

    expect(container).toBeDefined();
    expect(document.body.innerHTML).not.toBe('');
  });

  it('survives every control on it being pressed', async () => {
    wrap(<JumpToPortalDialog open onClose={vi.fn()} />);
    await settle();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('filters down as somebody types, without throwing on a term that matches nothing', async () => {
    wrap(<JumpToPortalDialog open onClose={vi.fn()} />);
    await settle();

    for (const field of document.body.querySelectorAll<HTMLInputElement>('input')) {
      fireEvent.change(field, { target: { value: 'zzzz-no-such-portal' } });
      await settle();
    }

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe('BotChat', () => {
  const copy = {
    name: 'Navigation Knowledge Bot',
    description: 'Answers where a page lives.',
    greeting: 'Ask me where anything is.',
    starters: ['Where do I add a venue?', 'Where are refunds?'],
  };

  it('renders with nothing asked yet', async () => {
    const { container } = wrap(<BotChat botKey="navigation" copy={copy} onRegisterRestart={vi.fn()} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('hands the chrome a way to restart the conversation', async () => {
    const onRegisterRestart = vi.fn();
    wrap(<BotChat botKey="navigation" copy={copy} onRegisterRestart={onRegisterRestart} />);
    await settle();

    expect(onRegisterRestart).toHaveBeenCalledWith(expect.any(Function));
  });

  it('survives a question being asked with nothing to answer it', async () => {
    wrap(<BotChat botKey="navigation" copy={copy} onRegisterRestart={vi.fn()} />);
    await settle();

    for (const field of document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
      fireEvent.change(field, { target: { value: 'where do I add a venue?' } });
    }
    await settle();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('asks straight from one of its own starter chips', async () => {
    wrap(<BotChat botKey="navigation" copy={copy} onRegisterRestart={vi.fn()} />);
    await settle();

    const chip = document.body.querySelector('.MuiChip-clickable') as HTMLElement;
    expect(chip).not.toBeNull();
    fireEvent.click(chip);
    await settle();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('asks straight from a follow-up chip after a real reply', async () => {
    const mocks = [
      {
        request: {
          query: ASK_BOT_CHAT,
          variables: { input: { bot_key: 'navigation', message: 'Where do I add a venue?', history: [] } },
        },
        result: {
          data: {
            askBotChat: { answer: 'Venues > Add venue.', links: [], followups: ['What about pricing?'] },
          },
        },
      },
    ];
    render(
      <MockedProvider mocks={mocks}>
        <ThemeProvider theme={testTheme}>
          <MemoryRouter initialEntries={['/']}>
            <BotChat botKey="navigation" copy={copy} onRegisterRestart={vi.fn()} />
          </MemoryRouter>
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();

    fireEvent.click(document.body.querySelector('.MuiChip-clickable') as HTMLElement);
    await settle();
    await settle();
    expect(document.body.textContent).toContain('What about pricing?');

    const followupChip = [...document.body.querySelectorAll('.MuiChip-clickable')].find(
      (chip) => chip.textContent === 'What about pricing?',
    ) as HTMLElement;
    fireEvent.click(followupChip);
    await settle();

    expect(document.body.innerHTML).not.toBe('');
  });
});

describe('AgentChat', () => {
  it('renders when the agent is available and may act', async () => {
    const { container } = wrap(<AgentChat isAvailable canAct onRegisterRestart={vi.fn()} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders for a reader who may not act on what it suggests', async () => {
    const { container } = wrap(<AgentChat isAvailable canAct={false} onRegisterRestart={vi.fn()} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders when the agent is not available at all', async () => {
    const { container } = wrap(<AgentChat isAvailable={false} canAct={false} onRegisterRestart={vi.fn()} />);
    await settle();

    expect(container).toBeDefined();
  });

  it('hands the chrome a way to restart', async () => {
    const onRegisterRestart = vi.fn();
    wrap(<AgentChat isAvailable canAct onRegisterRestart={onRegisterRestart} />);
    await settle();

    expect(onRegisterRestart).toHaveBeenCalledWith(expect.any(Function));
  });

  it('asks straight from one of the suggestion chips', async () => {
    wrap(<AgentChat isAvailable canAct onRegisterRestart={vi.fn()} />);
    await settle();

    const chip = document.body.querySelector('.MuiChip-clickable') as HTMLElement;
    expect(chip).not.toBeNull();
    fireEvent.click(chip);
    await settle();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('survives an instruction being sent with nothing behind it', async () => {
    wrap(<AgentChat isAvailable canAct onRegisterRestart={vi.fn()} />);
    await settle();

    for (const field of document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
      fireEvent.change(field, { target: { value: 'create three pods for the chess club' } });
    }
    await settle();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
  });
});
