import { describe, expect, it } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import PromptLibraryPage from '../../src/pages/prompt-library';
import {
  AI_PROMPTS,
  CREATE_AI_PROMPT,
  DELETE_AI_PROMPT,
  type AiPrompt,
} from '../../src/pages/prompt-library/queries';
import { renderWithProviders } from './testkit';

const prompt = (over: Partial<AiPrompt>): AiPrompt => ({
  id: 'p1',
  name: 'Prompt',
  description: 'A prompt',
  content: 'content that is long enough',
  category: 'General',
  target_model: 'gpt-4o-mini',
  token_count: 10,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
  ...over,
});

const listMock = (prompts: AiPrompt[]): MockedResponse => ({
  request: { query: AI_PROMPTS, variables: { filter: { search: null } } },
  maxUsageCount: 20,
  result: { data: { aiPrompts: prompts } },
});

const deleteMock = (id: string, fail = false): MockedResponse => ({
  request: { query: DELETE_AI_PROMPT, variables: { id } },
  ...(fail
    ? { result: { errors: [{ message: 'Cannot delete this prompt' }] } }
    : { result: { data: { deleteAiPrompt: true } } }),
});

const rows = [
  prompt({ id: 'a', name: 'Alpha', target_model: '' }),
  prompt({ id: 'b', name: 'Beta' }),
];

describe('PromptLibraryPage', () => {
  it('shows the empty state when there are no prompts', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [listMock([])] });
    expect(await screen.findByText('Prompt Library')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/no prompts yet/i)).toBeInTheDocument());
  });

  it('lists prompts and renders a placeholder for a missing model', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [listMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText('Beta')).toBeInTheDocument();
    // Alpha has no target_model → the em-dash placeholder renders.
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('opens and cancels the create dialog', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [listMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add prompt/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add prompt')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the edit dialog seeded from a row', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [listMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit prompt')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Alpha')).toBeInTheDocument();
  });

  it('creates a prompt from the dialog and refetches the list on save', async () => {
    const createMock: MockedResponse = {
      request: { query: CREATE_AI_PROMPT },
      variableMatcher: () => true,
      result: { data: { createAiPrompt: { id: 'new-1' } } },
    };
    // Single-use, ordered mocks: first list is empty, then create, then the
    // refetch returns the freshly-created row (no maxUsageCount so the refetch
    // isn't swallowed by the empty list mock).
    const emptyOnce: MockedResponse = {
      request: { query: AI_PROMPTS, variables: { filter: { search: null } } },
      result: { data: { aiPrompts: [] } },
    };
    const refetchWithRow: MockedResponse = {
      request: { query: AI_PROMPTS, variables: { filter: { search: null } } },
      result: { data: { aiPrompts: [prompt({ id: 'new-1', name: 'Freshly Made' })] } },
    };
    renderWithProviders(<PromptLibraryPage />, {
      mocks: [emptyOnce, createMock, refetchWithRow],
    });
    await waitFor(() => expect(screen.getByText(/no prompts yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add prompt/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Name/i), { target: { value: 'Freshly Made' } });
    fireEvent.change(within(dialog).getByLabelText(/Prompt content/i), {
      target: { value: 'Generate a concise summary of the input text.' },
    });
    const add = within(dialog).getByRole('button', { name: 'Add' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    await waitFor(() => expect(screen.getByText('Freshly Made')).toBeInTheDocument());
  });

  it('deletes a prompt through the confirmation dialog', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [listMock(rows), deleteMock('a')] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Delete "Alpha"\?/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancels the delete confirmation without deleting', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [listMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('surfaces a delete error and dismisses it', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [listMock(rows), deleteMock('a', true)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    const alert = await screen.findByText(/cannot delete this prompt/i);
    expect(alert).toBeInTheDocument();
    // The confirm dialog closes on error; once it's gone the Alert's close
    // button is no longer behind an aria-hidden modal.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByText(/cannot delete this prompt/i)).not.toBeInTheDocument());
  });
});
