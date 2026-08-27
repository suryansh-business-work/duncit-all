/**
 * The AI Library page with the catalogue actually answered: rows on the grid,
 * and the row actions — edit, reset (code) and delete (AI) — driven the way an
 * operator drives them, confirmation dialogs included.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AI_PROMPTS, DELETE_AI_PROMPT, RESET_AI_PROMPT, UPDATE_AI_PROMPT } from '../src/queries';
import { PromptLibraryView } from '../src/mui/PromptLibraryView';
import { API_ORIGIN, installGridViewport, prompt, renderInPortal, settle } from './support/harness';

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
    // A code prompt cannot be deleted here (its call site reads it) or created.
    const del = screen.getByLabelText('Delete Navigation Knowledge Bot');
    expect((del as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Add AI prompt')).toBeNull();
  });

  it('reset warns with the row named, runs on confirm, and ignores a straggler press', async () => {
    const reset: MockedResponse = {
      request: { query: RESET_AI_PROMPT, variables: { id: 'p-1' } },
      result: { data: { resetAiPrompt: { id: 'p-1', content: codeRow.content } } },
    };
    await openLibrary([listMock('CODE', [codeRow]), reset]);

    // First press, second thoughts: Cancel closes without running anything.
    fireEvent.click(screen.getByLabelText('Reset Navigation Knowledge Bot'));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull());

    fireEvent.click(screen.getByLabelText('Reset Navigation Knowledge Bot'));
    await settle();
    expect(screen.getByText(/Restore the shipped default for "Navigation Knowledge Bot"/)).toBeDefined();

    const confirm = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(confirm);
    await settle();

    // The single-use mock is spent; a second press while the dialog is on its
    // way out must hit the cleared-row guard, not fire the mutation again.
    if (confirm.isConnected) fireEvent.click(confirm);
    await settle();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a refused reset surfaces the API error, which the operator can dismiss', async () => {
    const refused: MockedResponse = {
      request: { query: RESET_AI_PROMPT, variables: { id: 'p-1' } },
      result: { errors: [new GraphQLError('Reset refused')] },
    };
    await openLibrary([listMock('CODE', [codeRow]), refused]);

    fireEvent.click(screen.getByLabelText('Reset Navigation Knowledge Bot'));
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
    // A pasted ?selectedtab=AI link opens on the AI tab. (Clicking the tab
    // strip instead would flip the affordances but NOT the rows — the kind is
    // baked into fetchRows, which the table never re-runs on its own; see the
    // reported PromptLibraryView bug.)
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

    const remove = screen.getByLabelText('Delete Weekly digest writer');
    expect((remove as HTMLButtonElement).disabled).toBe(false);
    // Once with second thoughts, then for real.
    fireEvent.click(remove);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/Delete "Weekly digest writer"\?/)).toBeNull());

    // The row re-rendered when the first dialog closed, so the captured node is
    // detached — re-query it before the second click.
    fireEvent.click(screen.getByLabelText('Delete Weekly digest writer'));
    await settle();
    expect(screen.getByText(/Delete "Weekly digest writer"\?/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await settle();

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
