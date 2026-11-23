/**
 * What every rendered test in this package shares: the providers a portal root
 * mounts around the library, a settled-render helper, a row fixture and the
 * jsdom layout the grid needs before it will mount a single row.
 */
import type { ReactElement } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { DuncitLocalizationProvider, PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { ConfirmProvider } from '@duncit/dialogs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';

import type { AiPrompt } from '../../src/types';

export const API_ORIGIN = 'https://server.duncit.com';

/** The admin's display settings, answered so the date pickers and the grid's date column have a pattern. */
const appSettingsMock: MockedResponse = {
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: {
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        time_source: 'BROWSER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2026-08-27T09:00:00.000Z',
        min_signup_age: 18,
        draft_retention_days: 30,
      },
    },
  },
};

/**
 * Renders under the providers the AI portal's root supplies: Apollo, the MUI
 * theme, the localization provider (rule 11) — the table's date-range filter
 * opens a MUI X picker, which throws without it — and the confirm provider
 * `mountPortal` puts above every page (`useConfirm` throws without it).
 */
export const renderInPortal = (ui: ReactElement, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[appSettingsMock, ...mocks]}>
      <ThemeProvider theme={createTheme()}>
        <DuncitLocalizationProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </DuncitLocalizationProvider>
      </ThemeProvider>
    </MockedProvider>,
  );

/**
 * The row's menu button. A dialog or menu that just closed keeps the page
 * aria-hidden until its exit transition ends; on a loaded CI runner that took
 * longer than findByRole's default 1 s, so wait up to 5 s (tests allow 30 s).
 */
const rowMenuButton = (rowName: string) =>
  screen.findByRole('button', { name: `Actions for ${rowName}` }, { timeout: 5_000 });

/** Opens a row's menu ("Actions for <name>") and picks one item from it, as an operator would. */
export const rowAction = async (rowName: string, item: string) => {
  fireEvent.click(await rowMenuButton(rowName));
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
};

/** The items a row's menu offers, by label. Closes the menu again. */
export const rowMenuItems = async (rowName: string): Promise<string[]> => {
  fireEvent.click(await rowMenuButton(rowName));
  const items = await screen.findAllByRole('menuitem');
  const labels = items.map((item) => item.textContent ?? '');
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  return labels;
};

/** Lets a mocked Apollo answer and the state it sets land. */
export const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

export const prompt = (over: Partial<AiPrompt> = {}): AiPrompt => ({
  id: 'p-1',
  key: 'ask-bot.navigation',
  kind: 'CODE',
  role: 'SYSTEM',
  name: 'Navigation Knowledge Bot',
  description: 'Answers where a page lives.',
  content: 'Use {{navigation_map}} to answer {{user_question}}.',
  category: 'Navigation',
  target_model: 'claude-opus-5',
  variables: [
    { name: 'navigation_map', label: 'Navigation map', required: true, example: '', description: 'The page catalogue' },
    {
      name: 'user_question',
      label: 'Question',
      required: true,
      example: 'where do I add a venue?',
      description: '',
    },
  ],
  tasks: ['ask-bot'],
  usage: [],
  token_count: 42,
  is_active: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-02T00:00:00.000Z',
  ...over,
});

const BOX = { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 };

class NoopResizeObserver {
  observe(): void {
    /* jsdom never resizes */
  }

  unobserve(): void {
    /* jsdom never resizes */
  }

  disconnect(): void {
    /* jsdom never resizes */
  }
}

/**
 * Every element in jsdom measures 0x0, and a virtualised grid asks how wide
 * its viewport is before deciding which cells to mount — so it mounts none,
 * and the cell renderers never run. Scoped to the suite that calls it: this is
 * a lie about layout, and nothing else should inherit it.
 *
 * Returns the undo, for `afterAll`.
 */
export function installGridViewport(): () => void {
  const proto = globalThis.HTMLElement.prototype;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const sizes: Record<string, number> = {
    offsetWidth: BOX.width,
    clientWidth: BOX.width,
    offsetHeight: BOX.height,
    clientHeight: BOX.height,
  };
  for (const [property, value] of Object.entries(sizes)) {
    previous.set(property, Object.getOwnPropertyDescriptor(proto, property));
    Object.defineProperty(proto, property, { configurable: true, get: () => value });
  }
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = () => ({ ...BOX, toJSON: () => BOX });
  const observer = globalThis.ResizeObserver;
  globalThis.ResizeObserver ??= NoopResizeObserver as unknown as typeof globalThis.ResizeObserver;

  return () => {
    for (const [property, descriptor] of previous) {
      if (descriptor) Object.defineProperty(proto, property, descriptor);
      else delete (proto as unknown as Record<string, unknown>)[property];
    }
    Element.prototype.getBoundingClientRect = rect;
    globalThis.ResizeObserver = observer;
  };
}
