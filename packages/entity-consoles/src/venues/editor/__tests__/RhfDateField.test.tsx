import { describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RhfDateField from '../fields/RhfDateField';
import { renderForm } from './harness';

/**
 * A calendar DAY kept as 'yyyy-MM-dd' on the form, edited through MUI X.
 *
 * What matters is the round trip: the stored string opens as that day, a day the
 * admin picks is written back in the same shape, and anything that is not a
 * whole date — cleared, half-typed, unparseable — is stored as blank rather than
 * as a garbage string the server would refuse.
 */
interface Values {
  until?: string;
}

const HINT = 'Leave blank to keep going.';

const renderDate = (defaults: Values, hint?: string) =>
  renderForm<Values>(defaults, ({ control }) => (
    <RhfDateField control={control} name="until" label="Stop on" hint={hint} />
  ));

const section = (name: 'Day' | 'Month' | 'Year') => screen.getByRole('spinbutton', { name });

describe('RhfDateField', () => {
  it('opens a stored day on that day, with the hint under it', () => {
    renderDate({ until: '2026-03-04' }, HINT);

    expect(section('Day')).toHaveAttribute('aria-valuenow', '4');
    expect(section('Month')).toHaveAttribute('aria-valuenow', '3');
    expect(section('Year')).toHaveAttribute('aria-valuenow', '2026');
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it('writes the day picked from the calendar back as yyyy-MM-dd', async () => {
    const user = userEvent.setup();
    const { form } = renderDate({ until: '2026-03-04' }, HINT);

    await user.click(screen.getByRole('button', { name: /Choose date/ }));
    const calendar = await screen.findByRole('dialog');
    await user.click(within(calendar).getByRole('gridcell', { name: '15' }));

    expect(form().getValues('until')).toBe('2026-03-15');
  });

  it('stores blank when the admin clears the whole date', async () => {
    const user = userEvent.setup();
    const { form } = renderDate({ until: '2026-03-04' });

    await user.click(section('Day'));
    await user.keyboard('{Control>}a{/Control}{Backspace}');

    expect(form().getValues('until')).toBe('');
  });

  it('stores blank rather than half a date while one part is erased', async () => {
    const user = userEvent.setup();
    const { form } = renderDate({ until: '2026-03-04' });

    await user.click(section('Day'));
    await user.keyboard('{Backspace}');

    // Month and year are still on screen; the stored value is not a date yet.
    expect(section('Month')).toHaveAttribute('aria-valuenow', '3');
    expect(form().getValues('until')).toBe('');
  });

  it('opens empty on an unset field and on a stored value that is not a date', () => {
    renderDate({});
    expect(section('Day')).not.toHaveAttribute('aria-valuenow');

    renderForm<Values>({ until: 'next tuesday' }, ({ control }) => (
      <RhfDateField control={control} name="until" label="Date of birth" />
    ));
    const [, legacy] = screen.getAllByRole('spinbutton', { name: 'Day' });
    expect(legacy).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it('shows the validation message in place of the hint', () => {
    const { form } = renderDate({ until: '' }, HINT);

    act(() => {
      form().setError('until', { message: 'Stop date must be after today' });
    });

    expect(screen.getByText('Stop date must be after today')).toBeInTheDocument();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(screen.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
  });
});
