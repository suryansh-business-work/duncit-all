import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

import { DuplicateLookForm } from '../../src/pages/occasions-page/duplicate-look-form';

const LOOK = { key: 'diwali', name: 'Diwali' };

const open = (look: typeof LOOK | null, onSubmit = vi.fn().mockResolvedValue(true), onClose = vi.fn()) => {
  renderWithProviders(<DuplicateLookForm look={look} onClose={onClose} onSubmit={onSubmit} />);
  return { onSubmit, onClose };
};

describe('DuplicateLookForm', () => {
  it('stays closed with no look to copy', () => {
    open(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('suggests a name for the copy and explains what is copied', () => {
    open(LOOK);
    const dialog = screen.getByRole('dialog', { name: 'Duplicate Diwali' });
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Diwali copy');
    expect(within(dialog).getByText('The copy starts with the same design and no dates. The original does not change.')).toBeInTheDocument();
  });

  it('needs a name, and one the server can keep', async () => {
    const { onSubmit } = open(LOOK);
    const name = screen.getByLabelText(/^Name/);
    fireEvent.change(name, { target: { value: '   ' } });
    expect(await screen.findByText('Give the look a name.')).toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'x'.repeat(61) } });
    expect(await screen.findByText('Keep the name under 60 characters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: 'x'.repeat(60) } });
    await waitFor(() => expect(screen.queryByText('Keep the name under 60 characters.')).not.toBeInTheDocument());
  });

  it('sends the trimmed name and closes once the copy exists', async () => {
    const { onSubmit, onClose } = open(LOOK);
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: '  Diwali 2027  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Diwali 2027'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('stays open when the copy was not made, and Cancel closes it', async () => {
    const { onSubmit, onClose } = open(LOOK, vi.fn().mockResolvedValue(false));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Diwali copy'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('occasion-duplicate-form')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
