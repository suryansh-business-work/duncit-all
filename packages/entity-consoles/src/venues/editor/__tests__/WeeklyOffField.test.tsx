import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DefaultValues } from 'react-hook-form';
import WeeklyOffField from '../fields/WeeklyOffField';
import { blankVenueValues, type VenueFormValues } from '../types';
import { renderForm } from './harness';

/**
 * Weekly closures as 0..6 (Sun..Sat) — the shape the slot generator reads —
 * shown by the same weekday names the availability calendar prints.
 *
 * Typed as form DEFAULTS, which may leave the list out: a venue saved before
 * weekly closures existed loads with none.
 */
const withOffDays = (weekly_off_days: number[] | undefined): DefaultValues<VenueFormValues> => ({
  ...blankVenueValues,
  settings: { ...blankVenueValues.settings, weekly_off_days },
});

describe('WeeklyOffField', () => {
  it('stores the picked weekday as its index and names it in the box', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<VenueFormValues>(withOffDays(undefined), ({ control }) => (
      <WeeklyOffField control={control} />
    ));

    await user.click(screen.getByRole('combobox', { name: /Weekly off days/ }));
    await user.click(screen.getByRole('option', { name: 'Monday' }));

    expect(form().getValues('settings.weekly_off_days')).toEqual([1]);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('combobox', { name: /Weekly off days/ })).toHaveTextContent('Monday');
  });

  it('ticks the stored days and adds another beside them', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<VenueFormValues>(withOffDays([0, 6]), ({ control }) => (
      <WeeklyOffField control={control} />
    ));

    const box = screen.getByRole('combobox', { name: /Weekly off days/ });
    expect(box).toHaveTextContent('Sunday, Saturday');

    await user.click(box);
    const sunday = screen.getByRole('option', { name: 'Sunday' });
    expect(sunday.querySelector('input[type="checkbox"]')).toBeChecked();
    expect(
      screen.getByRole('option', { name: 'Wednesday' }).querySelector('input[type="checkbox"]'),
    ).not.toBeChecked();

    await user.click(screen.getByRole('option', { name: 'Wednesday' }));
    expect(form().getValues('settings.weekly_off_days')).toEqual([0, 6, 3]);
  });
});
