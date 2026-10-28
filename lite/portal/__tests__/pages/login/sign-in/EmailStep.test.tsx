import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailStep } from '../../../../pages/login/sign-in/EmailStep';

type Submit = (email: string) => Promise<void>;

describe('EmailStep', () => {
  it('asks for the email with its hint and a send button', () => {
    render(<EmailStep busy={false} onSubmit={vi.fn<Submit>()} />);
    const box = screen.getByTestId('sign-in-email');
    expect(screen.getByLabelText(/Email/)).toBe(box);
    expect(box).toHaveAttribute('type', 'email');
    expect(box).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByText('A code is sent to this address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send me a code' })).toBeEnabled();
  });

  it('sends the address lowercased', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(<EmailStep busy={false} onSubmit={onSubmit} />);
    await user.type(screen.getByTestId('sign-in-email'), 'Asha@Lite.Example');
    await user.click(screen.getByTestId('sign-in-send-code'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('asha@lite.example'));
  });

  it('asks for an address when the box is empty, and a valid one otherwise', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(<EmailStep busy={false} onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('sign-in-send-code'));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    await user.type(screen.getByTestId('sign-in-email'), 'asha@lite');
    await user.click(screen.getByTestId('sign-in-send-code'));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reads Sending… and locks the box while the code is requested', () => {
    render(<EmailStep busy onSubmit={vi.fn<Submit>()} />);
    expect(screen.getByTestId('sign-in-send-code')).toHaveTextContent('Sending…');
    expect(screen.getByTestId('sign-in-send-code')).toBeDisabled();
    expect(screen.getByTestId('sign-in-email')).toBeDisabled();
  });
});
