import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DateField from '@/forms/fields/DateField';

/** A form with the date field and a button that flags it invalid, as a resolver would. */
function Harness({ hint, initial = null }: Readonly<{ hint?: string; initial?: Date | null }>) {
  const methods = useForm<{ follow_up: Date | null }>({ defaultValues: { follow_up: initial } });
  const picked = methods.watch('follow_up');
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormProvider {...methods}>
        <DateField name="follow_up" label="Next follow-up" hint={hint} />
        <button type="button" onClick={() => methods.setError('follow_up', { message: 'Pick a future date' })}>
          flag
        </button>
        <output data-testid="value">{picked ? picked.toDateString() : 'none'}</output>
      </FormProvider>
    </LocalizationProvider>
  );
}

const helper = () => document.querySelector('.MuiFormHelperText-root');

describe('DateField', () => {
  it('shows the hint under the picker while the value is valid', () => {
    render(<Harness hint="When to call back" />);

    expect(helper()).toHaveTextContent('When to call back');
    expect(helper()).not.toHaveClass('Mui-error');
  });

  it('reserves an empty helper line when there is no hint', () => {
    render(<Harness />);

    expect(helper()?.textContent).toBe(String.fromCodePoint(0x200b)); // MUI's zero-width placeholder for a blank helper line
  });

  it('writes the day chosen in the calendar back to the form', async () => {
    render(<Harness initial={new Date(2026, 9, 4)} />);

    fireEvent.click(screen.getByRole('button', { name: /Choose date/ }));
    fireEvent.click(await screen.findByRole('gridcell', { name: '15' }));

    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('Thu Oct 15 2026'));
  });

  it('replaces the hint with the validation error and marks the field invalid', () => {
    render(<Harness hint="When to call back" />);

    fireEvent.click(screen.getByRole('button', { name: 'flag' }));

    expect(helper()).toHaveTextContent('Pick a future date');
    expect(helper()).toHaveClass('Mui-error');
    expect(screen.queryByText('When to call back')).toBeNull();
  });
});
