import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import type { DefaultValues } from 'react-hook-form';
import HolidaysField from '../fields/HolidaysField';
import { blankVenueValues, type VenueFormValues } from '../types';
import { renderForm } from './harness';

/**
 * The days a venue is closed, stored as 'yyyy-MM-dd' and kept in date order so
 * the list reads the way a calendar does.
 *
 * Typed as form DEFAULTS, which may leave the list out: a venue saved before
 * holidays existed loads with none, and the field must read that as empty.
 */
const withHolidays = (holidays: string[] | undefined): DefaultValues<VenueFormValues> => ({
  ...blankVenueValues,
  settings: { ...blankVenueValues.settings, holidays },
});

const renderHolidays = (holidays: string[] | undefined) =>
  renderForm<VenueFormValues>(withHolidays(holidays), ({ control }) => (
    <HolidaysField control={control} />
  ));

const addButton = () => screen.getByRole('button', { name: 'Add' });

/** Picks the 15th of the month the calendar opens on (today's, while blank). */
async function pickFifteenth(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Choose date/ }));
  const calendar = await screen.findByRole('dialog');
  await user.click(within(calendar).getByRole('gridcell', { name: '15' }));
  await user.click(within(calendar).getByRole('button', { name: 'OK' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const today = new Date();
  return format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
}

/** Answers the picker's desktop-mode query the way a mouse-driven browser does. */
const desktopPointer = (query: string): MediaQueryList => ({
  matches: query.includes('pointer: fine'),
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HolidaysField', () => {
  it('starts with nothing added and nothing to add', () => {
    renderHolidays(undefined);

    expect(screen.getByText('No holidays added.')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it('adds the picked day in date order and resets the picker', async () => {
    const user = userEvent.setup();
    const { form } = renderHolidays(['2099-12-25', '2000-01-26']);

    const day = await pickFifteenth(user);
    expect(addButton()).toBeEnabled();
    await user.click(addButton());

    expect(form().getValues('settings.holidays')).toEqual(['2000-01-26', day, '2099-12-25']);
    expect(screen.getByRole('button', { name: day })).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it('does not add the same day twice', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const day = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
    const { form } = renderHolidays([day]);

    await pickFifteenth(user);
    await user.click(addButton());

    expect(form().getValues('settings.holidays')).toEqual([day]);
    expect(addButton()).toBeDisabled();
  });

  it('ignores a typed date that does not exist', async () => {
    // A mouse-and-keyboard admin gets the desktop field, whose parts can be typed.
    vi.spyOn(globalThis, 'matchMedia').mockImplementation(desktopPointer);
    const user = userEvent.setup();
    const { form } = renderHolidays([]);

    // A half-typed field publishes nothing, so Add stays off until every part is filled.
    await user.click(screen.getByRole('spinbutton', { name: 'Day' }));
    await user.keyboard('31');
    expect(addButton()).toBeDisabled();
    await user.click(screen.getByRole('spinbutton', { name: 'Month' }));
    await user.keyboard('02');
    await user.click(screen.getByRole('spinbutton', { name: 'Year' }));
    await user.keyboard('2026');

    // Every part is filled, so Add is offered — but 31 February is not a day.
    await waitFor(() => expect(addButton()).toBeEnabled());
    await user.click(addButton());

    expect(form().getValues('settings.holidays')).toEqual([]);
    expect(screen.getByText('No holidays added.')).toBeInTheDocument();
  });

  it('removes a holiday when its chip is deleted', async () => {
    const user = userEvent.setup();
    const { form } = renderHolidays(['2026-01-26', '2026-08-15']);

    const chip = screen.getByRole('button', { name: '2026-01-26' });
    await user.click(within(chip).getByTestId('CancelIcon'));

    expect(form().getValues('settings.holidays')).toEqual(['2026-08-15']);
  });
});
