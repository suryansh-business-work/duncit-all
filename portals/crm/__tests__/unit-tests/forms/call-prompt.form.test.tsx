import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CallPromptForm } from '@/forms/call-prompt';

/**
 * Validation + submit flow for the Static Content (AI Call Prompt) form.
 * The repo's component tests run on vitest + RTL, so the rule-10 form test
 * lives here rather than as a Cypress component spec.
 */
describe('CallPromptForm', () => {
  it('blocks submit until name and context are valid', async () => {
    const onSubmit = vi.fn();
    render(<CallPromptForm onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: /save/i });
    expect(submit).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values once required fields are filled', async () => {
    const onSubmit = vi.fn();
    render(<CallPromptForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Venue pitch' } });
    fireEvent.change(screen.getByLabelText(/static content/i), {
      target: { value: 'You are a Duncit agent. Pitch the venue listing politely.' },
    });
    const submit = screen.getByRole('button', { name: /save/i });
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Venue pitch',
      language: 'auto',
      is_active: true,
    });
  });

  it('shows a validation hint for too-short context', async () => {
    render(<CallPromptForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/static content/i), { target: { value: 'short' } });
    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument();
  });

  it('flags an over-long description and a missing language when an invalid prompt is submitted', async () => {
    const onSubmit = vi.fn();
    render(
      <CallPromptForm
        onSubmit={onSubmit}
        defaultValues={{
          name: 'Venue pitch',
          description: 'd'.repeat(201),
          language: '',
          context: 'You are a Duncit agent. Pitch the venue listing politely.',
        }}
      />,
    );
    expect(screen.getByText('Optional — what this prompt is for')).toBeInTheDocument();
    expect(screen.getByText('Language the AI agent speaks')).toBeInTheDocument();

    fireEvent.submit(screen.getByTestId('call-prompt-form'));

    expect(await screen.findByText('Keep the description under 200 characters')).toBeInTheDocument();
    expect(screen.getByText('Select a language')).toBeInTheDocument();
    expect(screen.queryByText('Optional — what this prompt is for')).toBeNull();
    expect(screen.queryByText('Language the AI agent speaks')).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits an inactive prompt after the Active switch is turned off', async () => {
    const onSubmit = vi.fn();
    render(
      <CallPromptForm
        onSubmit={onSubmit}
        defaultValues={{ name: 'Venue pitch', context: 'You are a Duncit agent. Pitch the venue listing politely.' }}
      />,
    );
    const active = screen.getByRole('switch', { name: /active/i });
    expect(active).toBeChecked();

    fireEvent.click(active);
    expect(active).not.toBeChecked();
    fireEvent.submit(screen.getByTestId('call-prompt-form'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Venue pitch', is_active: false });
  });

  it('shows a saving state and locks Cancel while submitting', () => {
    const onCancel = vi.fn();
    render(<CallPromptForm onSubmit={vi.fn()} onCancel={onCancel} submitting submitLabel="Create prompt" />);
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.queryByText('Create prompt')).toBeNull();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('uses the given submit label and lets the user cancel when idle', () => {
    const onCancel = vi.fn();
    render(<CallPromptForm onSubmit={vi.fn()} onCancel={onCancel} submitLabel="Create prompt" />);
    expect(screen.getByRole('button', { name: 'Create prompt' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
