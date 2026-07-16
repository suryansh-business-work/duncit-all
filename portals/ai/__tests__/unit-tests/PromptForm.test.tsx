import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { PromptForm, type PromptFormValues } from '../../src/forms/prompt';
import { renderWithProviders } from './testkit';

const fillValid = () => {
  fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Summarizer' } });
  fireEvent.change(screen.getByLabelText(/Prompt content/i), {
    target: { value: 'Summarize the following article in three bullets.' },
  });
};

describe('PromptForm', () => {
  it('shows a live token estimate that updates as content changes', async () => {
    renderWithProviders(<PromptForm onSubmit={vi.fn()} />);
    const chip = screen.getByTestId('prompt-token-count');
    expect(chip).toHaveTextContent('≈ 0 tokens');
    fireEvent.change(screen.getByLabelText(/Prompt content/i), {
      target: { value: 'Summarize the following article in three bullets.' },
    });
    await waitFor(() => expect(chip).not.toHaveTextContent('≈ 0 tokens'));
  });

  it('keeps submit disabled until the form is valid, then submits values', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<PromptForm onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: 'Save' });
    expect(submit).toBeDisabled();
    fillValid();
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const values = onSubmit.mock.calls[0][0] as PromptFormValues;
    expect(values.name).toBe('Summarizer');
    expect(values.is_active).toBe(true);
  });

  it('toggles the active switch', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<PromptForm onSubmit={onSubmit} submitLabel="Add" />);
    fillValid();
    const active = screen.getByRole('checkbox', { name: /Active/i });
    fireEvent.click(active);
    const submit = screen.getByRole('button', { name: 'Add' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect((onSubmit.mock.calls[0][0] as PromptFormValues).is_active).toBe(false);
  });

  it('renders a cancel button that invokes onCancel', () => {
    const onCancel = vi.fn();
    renderWithProviders(<PromptForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has no cancel button when onCancel is omitted and shows a saving state', () => {
    renderWithProviders(<PromptForm onSubmit={vi.fn()} submitting />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    const saving = screen.getByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
  });

  it('seeds fields from initialValues', () => {
    renderWithProviders(
      <PromptForm
        onSubmit={vi.fn()}
        initialValues={{ name: 'Seed', content: 'Seeded content that is long enough.' }}
      />,
    );
    const form = screen.getByTestId('prompt-form');
    expect(within(form).getByDisplayValue('Seed')).toBeInTheDocument();
  });
});
