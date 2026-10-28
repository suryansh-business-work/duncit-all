import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormDialog } from '../../components/FormDialog';

const preventing = () => vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

describe('FormDialog', () => {
  it('is a dialog named by its title, with Cancel and the shared Save copy', () => {
    render(
      <FormDialog open title="New city" onSubmit={preventing()} onClose={vi.fn()} testId="city-dialog">
        <input aria-label="Name" />
      </FormDialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'New city' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('city-dialog-cancel')).toHaveTextContent('Cancel');
    expect(screen.getByTestId('city-dialog-submit')).toHaveTextContent('Save');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('submits the form from the submit button and closes from Cancel', async () => {
    const user = userEvent.setup();
    const onSubmit = preventing();
    const onClose = vi.fn();
    render(
      <FormDialog open title="New city" onSubmit={onSubmit} onClose={onClose} submitLabel="Send" testId="d">
        <span>body</span>
      </FormDialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape when idle', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FormDialog open title="Edit" onSubmit={preventing()} onClose={onClose} testId="d">
        <span>body</span>
      </FormDialog>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('while busy, locks Cancel and the submit button and ignores Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FormDialog open busy title="Edit" onSubmit={preventing()} onClose={onClose} testId="d">
        <span>body</span>
      </FormDialog>,
    );
    expect(screen.getByTestId('d-cancel')).toBeDisabled();
    expect(screen.getByTestId('d-submit')).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('puts a secondary action in the footer beside the buttons', () => {
    render(
      <FormDialog open title="Edit" onSubmit={preventing()} onClose={vi.fn()} secondaryAction={<button type="button">Test</button>} testId="d">
        <span>body</span>
      </FormDialog>,
    );
    expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    render(
      <FormDialog open={false} title="Edit" onSubmit={preventing()} onClose={vi.fn()} testId="d">
        <span>body</span>
      </FormDialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
