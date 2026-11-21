/**
 * The AI Library page with the catalogue actually answered: rows on the grid,
 * and the row menu — reset (code), archive and delete (AI) — driven the way an
 * operator drives it, confirmation dialogs included.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AI_PROMPTS, DELETE_AI_PROMPT, RESET_AI_PROMPT, UPDATE_AI_PROMPT } from '../src/queries';
import { ARCHIVE_AI_PROMPT, UNARCHIVE_AI_PROMPT } from '../src/detailQueries';
import { detailMock, detailOf, eventMocks } from './support/detail-fixtures';
import { PromptLibraryView } from '../src/mui/PromptLibraryView';
import { API_ORIGIN, installGridViewport, prompt, renderInPortal, rowAction, rowMenuItems, settle } from './support/harness';

// The page's tab strip needs a <Router>; the stub keeps its contract (see it).
vi.mock('@duncit/tabs', () => import('./support/tabs-stub'));

// The grid mounts no cells in an unmeasured jsdom; hand it a viewport.
let restoreViewport: () => void;
beforeAll(() => {
  restoreViewport = installGridViewport();
});
afterAll(() => {
  restoreViewport();
});

afterEach(() => {
  vi.clearAllMocks();
  globalThis.window.history.replaceState(null, '', '/');
});

const codeRow = prompt();
const mjmlRow = prompt({
  id: 'p-3',
  key: 'email.mjml-writer',
  role: 'USER',
  name: 'MJML Writer',
  description: null,
  target_model: '',
  variables: [],
  usage: [{ file: 'server/src/modules/ai/email.ts', surface: 'Emails', trigger: 'Send test mail' }],
  token_count: 18,
});
const aiRow = prompt({
  id: 'p-2',
  key: 'digest.weekly',
  kind: 'AI',
  role: 'USER',
  name: 'Weekly digest writer',
  description: 'Writes the Monday digest.',
  variables: [],
  usage: [],
  token_count: 24,
});
// No key yet — the server slugs one on save; the key cell must render blank.
const draftRow = prompt({
  id: 'p-4',
  key: null,
  kind: 'AI',
  role: 'USER',
  name: 'Feedback summariser',
  description: null,
  target_model: '',
  variables: [],
  usage: [],
  token_count: 12,
});

const listMock = (kind: 'CODE' | 'AI', rows: readonly (typeof codeRow)[]): MockedResponse => ({
  request: { query: AI_PROMPTS, variables: { filter: { kind } } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { aiPrompts: rows } },
});

const openLibrary = async (mocks: readonly MockedResponse[]) => {
  renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, mocks);
  await settle();
  return screen.findByText('Navigation Knowledge Bot');
};

describe('PromptLibraryView with rows', () => {
  it('lists the code catalogue: description, role chip, default model, token size — and no delete or add', async () => {
    await openLibrary([listMock('CODE', [codeRow, mjmlRow])]);

    expect(screen.getByText('Answers where a page lives.')).toBeDefined();
    expect(screen.getAllByText('User turn').length).toBeGreaterThan(0);
    // A row with no target_model shows the configured default instead of a blank.
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0);
    expect(screen.getByText('≈ 42')).toBeDefined();
    // A code prompt cannot be deleted or archived here (its call site reads it),
    // nor created — but it can be reset.
    expect(await rowMenuItems('Navigation Knowledge Bot')).toEqual([
      'Open details',
      'Edit',
      'Quick view',
      'Copy library link',
      'Public share',
      'Reset to default',
    ]);
    expect(screen.queryByText('Add AI prompt')).toBeNull();
  });

  it('reset warns with the row named, runs on confirm, and ignores a straggler press', async () => {
    const reset: MockedResponse = {
      request: { query: RESET_AI_PROMPT, variables: { id: 'p-1' } },
      result: { data: { resetAiPrompt: { id: 'p-1', content: codeRow.content } } },
    };
    await openLibrary([listMock('CODE', [codeRow]), reset]);

    // First press, second thoughts: Cancel closes without running anything.
    await rowAction('Navigation Knowledge Bot', 'Reset to default');
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull());

    await rowAction('Navigation Knowledge Bot', 'Reset to default');
    await settle();
    expect(screen.getByText(/Restore the shipped default for "Navigation Knowledge Bot"/)).toBeDefined();

    const confirm = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(confirm);
    await settle();

    // The single-use mock is spent; a second press while the dialog is on its
    // way out must hit the cleared-row guard, not fire the mutation again.
    if (confirm.isConnected) fireEvent.click(confirm);
    await settle();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull());

    // No error surfaced: a second mutation would have hit the spent mock and
    // shown one. Only the ERROR alert counts — the page's standing "Public GET
    // API" notice is an Alert too, and a bare role query only missed it while
    // the closing dialog still had the page aria-hidden, a race a slow CI runner
    // lost.
    const errors = screen
      .queryAllByRole('alert')
      .filter((alert) => alert.classList.contains('MuiAlert-colorError'));
    expect(errors).toEqual([]);
  });

  it('a refused reset surfaces the API error, which the operator can dismiss', async () => {
    const refused: MockedResponse = {
      request: { query: RESET_AI_PROMPT, variables: { id: 'p-1' } },
      result: { errors: [new GraphQLError('Reset refused')] },
    };
    await openLibrary([listMock('CODE', [codeRow]), refused]);

    await rowAction('Navigation Knowledge Bot', 'Reset to default');
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await settle();

    expect(screen.getByText('Reset refused')).toBeDefined();
    fireEvent.click(screen.getByTitle('Close'));
    await waitFor(() => expect(screen.queryByText('Reset refused')).toBeNull());
  });

  it('the AI tab is where prompts are written: Add opens a blank editor, delete confirms then removes', async () => {
    const del: MockedResponse = {
      request: { query: DELETE_AI_PROMPT, variables: { id: 'p-2' } },
      result: { data: { deleteAiPrompt: true } },
    };
    // A pasted ?selectedtab=AI link opens on the AI tab.
    globalThis.window.history.replaceState(null, '', '/?selectedtab=AI');
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, [listMock('AI', [aiRow, draftRow]), del]);
    await settle();
    await screen.findByText('Weekly digest writer');
    expect(screen.getByText('Feedback summariser')).toBeDefined();

    fireEvent.click(screen.getByText('Add AI prompt'));
    await settle();
    expect(screen.getByText('Add an AI prompt')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await settle();

    // Once with second thoughts, then for real.
    await rowAction('Weekly digest writer', 'Delete');
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/Delete "Weekly digest writer"\?/)).toBeNull());

    await rowAction('Weekly digest writer', 'Delete');
    await settle();
    expect(screen.getByText(/Delete "Weekly digest writer"\?/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await settle();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('switching tabs swaps the rows: the table refetches when the tab changes', async () => {
    await openLibrary([listMock('CODE', [codeRow]), listMock('AI', [aiRow])]);

    fireEvent.click(screen.getByRole('tab', { name: 'AI Prompts' }));

    expect(await screen.findByText('Weekly digest writer')).toBeDefined();
    await waitFor(() => expect(screen.queryByText('Navigation Knowledge Bot')).toBeNull());
  });

  it('the AI row menu archives after confirming, and the Archived tab offers restore and delete only', async () => {
    const archive: MockedResponse = {
      request: { query: ARCHIVE_AI_PROMPT, variables: { id: 'p-2' } },
      result: { data: { archiveAiPrompt: { archived_at: '2026-11-22T10:00:00.000Z' } } },
    };
    const unarchive: MockedResponse = {
      request: { query: UNARCHIVE_AI_PROMPT, variables: { id: 'p-2' } },
      result: { data: { unarchiveAiPrompt: { archived_at: null } } },
    };
    const archivedList: MockedResponse = {
      request: { query: AI_PROMPTS, variables: { filter: { archived: true } } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: { data: { aiPrompts: [{ ...aiRow, archived_at: '2026-11-22T10:00:00.000Z' }] } },
    };
    globalThis.window.history.replaceState(null, '', '/?selectedtab=AI');
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, [listMock('AI', [aiRow]), archive, archivedList, unarchive]);
    await screen.findByText('Weekly digest writer');

    await rowAction('Weekly digest writer', 'Archive');
    expect(await screen.findByText(/Archive "Weekly digest writer"\?/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await settle();
    await waitFor(() => expect(screen.queryByText(/Archive "Weekly digest writer"\?/)).toBeNull());

    fireEvent.click(screen.getByRole('tab', { name: 'Archived' }));
    await screen.findByText('Weekly digest writer');
    expect(screen.queryByText(/Public GET API/)).toBeNull();
    expect(await rowMenuItems('Weekly digest writer')).toEqual([
      'Open details',
      'Quick view',
      'Copy library link',
      'Restore from archive',
      'Delete',
    ]);
    await rowAction('Weekly digest writer', 'Restore from archive');
    await settle();
    const errors = screen.queryAllByRole('alert').filter((alert) => alert.classList.contains('MuiAlert-colorError'));
    expect(errors).toEqual([]);
  });

  it('copies a library link from the row menu, and a quick view leads to the full details', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} portalOrigin="https://ai.duncit.com" />, [
      listMock('CODE', [{ ...codeRow, total_hits: 7 }]),
      detailMock(detailOf(codeRow)),
      ...eventMocks(codeRow.id),
    ]);
    await screen.findByText('Navigation Knowledge Bot');
    expect(screen.getByText('7')).toBeDefined();

    await rowAction('Navigation Knowledge Bot', 'Copy library link');
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://ai.duncit.com/library?selectedtab=CODE&prompt=ask-bot.navigation'),
    );
    writeText.mockRejectedValueOnce(new Error('blocked'));
    await rowAction('Navigation Knowledge Bot', 'Copy library link');
    await settle();

    await rowAction('Navigation Knowledge Bot', 'Quick view');
    expect(await screen.findByRole('dialog', { name: 'Navigation Knowledge Bot' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Open details' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Navigation Knowledge Bot' })).toBeDefined();
  });

  it('has no library link to copy for a prompt that has no key yet', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
    globalThis.window.history.replaceState(null, '', '/?selectedtab=AI');
    renderInPortal(<PromptLibraryView apiOrigin={API_ORIGIN} />, [listMock('AI', [draftRow])]);
    await screen.findByText('Feedback summariser');

    await rowAction('Feedback summariser', 'Copy library link');
    await settle();

    expect(writeText).not.toHaveBeenCalled();
  });
});
