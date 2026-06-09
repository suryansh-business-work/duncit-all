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
});
