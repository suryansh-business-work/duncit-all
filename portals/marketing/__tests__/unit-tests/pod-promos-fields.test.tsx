import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';

vi.mock('../../src/components/DateTimeField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).DateTimeFieldStub,
}));

import { PromoScheduleForm } from '../../src/pages/pod-promos-page/promo-schedule-form';
import MultiPickField from '../../src/pages/pod-promos-page/promo-settings-form/MultiPickField';

const ACCOUNTS = [{ id: 'acc1', label: 'Duncit (INSTAGRAM)' }];
const HOUR = 3_600_000;

describe('PromoScheduleForm — the time to post', () => {
  const renderForm = () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PromoScheduleForm accounts={ACCOUNTS} collaborators={null} timeZone="Asia/Kolkata" busy={false} onSubmit={onSubmit} />);
    return onSubmit;
  };

  it('refuses a time already past in place of the hint, and sends a future one', async () => {
    const onSubmit = renderForm();
    const help = screen.getByTestId('datetime-help-Post at');
    const save = screen.getByTestId('form-actions-row-submit');
    fireEvent.change(screen.getByLabelText('Post at'), { target: { value: new Date(Date.now() - HOUR).toISOString() } });
    await waitFor(() => expect(help).toHaveTextContent('Pick a time in the future, or leave it empty'));
    expect(screen.getByLabelText('Post at')).toHaveAttribute('aria-invalid', 'true');
    expect(save).toBeDisabled();

    const future = new Date(Date.now() + HOUR).toISOString();
    fireEvent.change(screen.getByLabelText('Post at'), { target: { value: future } });
    await waitFor(() => expect(help).toHaveTextContent('Leave empty to post at the time the settings give (Asia/Kolkata).'));
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ at: future });
  });
});

/** A form that gives the list no starting value, as react-hook-form does for a field left out of the defaults. */
function NoDefaultHarness({ onSubmit }: Readonly<{ onSubmit: (values: { ids?: string[] }) => void }>) {
  const { control, handleSubmit } = useForm<{ ids: string[] }>();
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <MultiPickField control={control} name="ids" label="Accounts" hint="Pick some" options={ACCOUNTS} disabled={false} testId="picker" />
      <button type="submit">Send</button>
    </form>
  );
}

describe('MultiPickField', () => {
  it('starts empty when the form has no value for it, and picks from there', async () => {
    const onSubmit = vi.fn();
    render(<NoDefaultHarness onSubmit={onSubmit} />);
    const picker = screen.getByTestId('picker');
    expect(within(picker).queryByRole('button', { name: 'Duncit (INSTAGRAM)' })).not.toBeInTheDocument();
    expect(within(picker).getByText('Pick some')).toBeInTheDocument();
    fireEvent.mouseDown(within(picker).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Duncit (INSTAGRAM)' }));
    expect(within(picker).getByText('Duncit (INSTAGRAM)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ ids: ['acc1'] });
  });
});
