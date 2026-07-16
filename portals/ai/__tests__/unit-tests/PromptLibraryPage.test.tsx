import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import PromptLibraryPage from '../../src/pages/prompt-library';
import { renderWithProviders } from '../testkit';
import {
  aiPromptsListMock,
  createPromptMock,
  deletePromptMock,
  makeAiPrompt,
} from '../mocks';

const rows = [
  makeAiPrompt({ id: 'a', name: 'Alpha', target_model: '' }),
  makeAiPrompt({ id: 'b', name: 'Beta' }),
];

describe('PromptLibraryPage', () => {
  it('shows the empty state when there are no prompts', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [aiPromptsListMock([])] });
    expect(await screen.findByText('Prompt Library')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/no prompts yet/i)).toBeInTheDocument());
  });

  it('lists prompts and renders a placeholder for a missing model', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [aiPromptsListMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText('Beta')).toBeInTheDocument();
    // Alpha has no target_model → the em-dash placeholder renders.
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('opens and cancels the create dialog', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [aiPromptsListMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add prompt/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add prompt')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the edit dialog seeded from a row', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [aiPromptsListMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit prompt')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Alpha')).toBeInTheDocument();
  });

  it('creates a prompt from the dialog and refetches the list on save', async () => {
    // Single-use, ordered mocks: first list is empty, then create, then the
    // refetch returns the freshly-created row (both list mocks are `once` so the
    // refetch isn't swallowed by the empty list mock).
    renderWithProviders(<PromptLibraryPage />, {
      mocks: [
        aiPromptsListMock([], { once: true }),
        createPromptMock(),
        aiPromptsListMock([makeAiPrompt({ id: 'new-1', name: 'Freshly Made' })], { once: true }),
      ],
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
    renderWithProviders(<PromptLibraryPage />, { mocks: [aiPromptsListMock(rows), deletePromptMock('a')] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Delete "Alpha"\?/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancels the delete confirmation without deleting', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [aiPromptsListMock(rows)] });
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('surfaces a delete error and dismisses it', async () => {
    renderWithProviders(<PromptLibraryPage />, { mocks: [aiPromptsListMock(rows), deletePromptMock('a', { fail: true })] });
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
