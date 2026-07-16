import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import PromptDialog from '../../src/pages/prompt-library/PromptDialog';
import { renderWithProviders } from '../testkit';
import { createPromptMock, makeAiPrompt, updatePromptMock } from '../mocks';

describe('PromptDialog', () => {
  it('renders nothing interactive when closed', () => {
    renderWithProviders(
      <PromptDialog open={false} prompt={null} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates a new prompt and closes on success', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(
      <PromptDialog open prompt={null} onClose={onClose} onSaved={onSaved} />,
      { mocks: [createPromptMock()] },
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add prompt')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Name/i), { target: { value: 'Classifier' } });
    fireEvent.change(within(dialog).getByLabelText(/Prompt content/i), {
      target: { value: 'Classify the given text into one of the labels.' },
    });
    const add = within(dialog).getByRole('button', { name: 'Add' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('edits an existing prompt with a null description seed', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(
      <PromptDialog open prompt={makeAiPrompt({ description: null })} onClose={onClose} onSaved={onSaved} />,
      { mocks: [updatePromptMock()] },
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit prompt')).toBeInTheDocument();
    const save = within(dialog).getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('surfaces a server error and stays open', async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <PromptDialog open prompt={null} onClose={onClose} onSaved={vi.fn()} />,
      { mocks: [createPromptMock({ fail: true })] },
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Name/i), { target: { value: 'Dupe' } });
    fireEvent.change(within(dialog).getByLabelText(/Prompt content/i), {
      target: { value: 'Some sufficiently long prompt content here.' },
    });
    const add = within(dialog).getByRole('button', { name: 'Add' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    await waitFor(() => expect(screen.getByText(/name already exists/i)).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });
});
