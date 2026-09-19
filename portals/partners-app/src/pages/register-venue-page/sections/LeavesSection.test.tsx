import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { formatDay } from '@duncit/app-settings';
import LeavesSection from './LeavesSection';
import { UPDATE_VENUE_HOLIDAYS } from '../queries';
import { renderWithProviders } from '../../../__tests__/render';

/**
 * MUI X's sectioned field cannot be typed into under jsdom, so the picker is a
 * stub that fires what a real DatePicker emits: a picked day, or an Invalid
 * Date while a day is only half typed.
 */
vi.mock(import('@mui/x-date-pickers'), async (importOriginal) => ({
  ...(await importOriginal()),
  DatePicker: (({ label, disabled, onChange }: Readonly<{ label: string; disabled?: boolean; onChange: (value: Date | null) => void }>) => (
    <fieldset aria-label={label} disabled={disabled}>
      <button type="button" onClick={() => onChange(new Date(2026, 9, 2))}>
        pick 2 Oct
      </button>
      <button type="button" onClick={() => onChange(new Date(2026, 7, 15))}>
        pick 15 Aug
      </button>
      <button type="button" onClick={() => onChange(new Date('not-a-date'))}>
        half-typed
      </button>
    </fieldset>
  )) as never,
}));

afterEach(cleanup);

const holidaysMock = (holidays: string[], outcome: 'ok' | 'error' = 'ok'): MockedResponse => ({
  request: { query: UPDATE_VENUE_HOLIDAYS, variables: { venue_doc_id: 'venue-1', input: { holidays } } },
  result:
    outcome === 'ok'
      ? {
          data: {
            updateVenueSettings: {
              __typename: 'Venue',
              id: 'venue-1',
              settings: { __typename: 'VenueSettings', holidays },
            },
          },
        }
      : { errors: [new GraphQLError('Settings are read-only right now')] },
});

interface MountProps {
  venueId?: string | null;
  holidays?: string[];
  disabled?: boolean;
  mocks?: MockedResponse[];
}

const mount = ({ venueId = 'venue-1', holidays = ['2026-08-15'], disabled, mocks = [] }: MountProps = {}) => {
  const onSaved = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <LeavesSection venueId={venueId} holidays={holidays} disabled={disabled} onSaved={onSaved} />,
    { mocks }
  );
  return { onSaved };
};

const save = () => screen.getByRole('button', { name: 'Save leaves & holidays' });

describe('LeavesSection — before the venue exists', () => {
  it('asks for the details section first and keeps every control disabled', () => {
    mount({ venueId: null, holidays: [] });

    expect(
      screen.getByText('Save the Venue Details section first — leaves are stored on your venue.')
    ).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Add a leave date' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Add date' })).toHaveProperty('disabled', true);
    expect(screen.getByText('No leave dates yet.')).toBeTruthy();
    expect(save()).toHaveProperty('disabled', true);
  });
});

describe('LeavesSection — editing the dates', () => {
  it('lists the stored dates and keeps Save disabled until something changes', () => {
    mount();

    expect(screen.getByText(formatDay('2026-08-15'))).toBeTruthy();
    expect(save()).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Add date' })).toHaveProperty('disabled', true);
  });

  it('adds a picked day in date order, once, and clears the picker', () => {
    mount({ holidays: ['2026-12-25'] });

    fireEvent.click(screen.getByRole('button', { name: 'pick 2 Oct' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }));

    const chips = screen.getAllByText(/2026/);
    expect(chips.map((chip) => chip.textContent)).toEqual([formatDay('2026-10-02'), formatDay('2026-12-25')]);
    // Add is disabled again until another day is picked.
    expect(screen.getByRole('button', { name: 'Add date' })).toHaveProperty('disabled', true);
    expect(save()).toHaveProperty('disabled', false);
  });

  it('ignores a day that is already on the list', () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'pick 15 Aug' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }));

    expect(screen.getAllByText(formatDay('2026-08-15'))).toHaveLength(1);
    expect(save()).toHaveProperty('disabled', true);
  });

  it('adds nothing for a half-typed day', () => {
    mount({ holidays: [] });

    fireEvent.click(screen.getByRole('button', { name: 'half-typed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }));

    expect(screen.getByText('No leave dates yet.')).toBeTruthy();
  });

  it('removes a date through its chip', () => {
    mount();

    fireEvent.click(screen.getByTestId('CancelIcon'));

    expect(screen.getByText('No leave dates yet.')).toBeTruthy();
    expect(save()).toHaveProperty('disabled', false);
  });
});

describe('LeavesSection — saving', () => {
  it('saves the new list, refreshes the venue and confirms', async () => {
    const { onSaved } = mount({ mocks: [holidaysMock(['2026-08-15', '2026-10-02'])] });

    fireEvent.click(screen.getByRole('button', { name: 'pick 2 Oct' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }));
    fireEvent.click(save());

    const alert = await screen.findByText(
      'Leaves & holidays saved. These dates are now blocked for slots and bookings.'
    );
    expect(onSaved).toHaveBeenCalledTimes(1);

    // The confirmation can be dismissed.
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Leaves & holidays saved. These dates are now blocked for slots and bookings.')
      ).toBeNull()
    );
  });

  it('shows the server error and does not report the save', async () => {
    const { onSaved } = mount({ holidays: [], mocks: [holidaysMock(['2026-10-02'], 'error')] });

    fireEvent.click(screen.getByRole('button', { name: 'pick 2 Oct' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }));
    fireEvent.click(save());

    expect(await screen.findByText('Settings are read-only right now')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('LeavesSection — read-only', () => {
  it('shows the dates without a way to change or save them', () => {
    mount({ disabled: true });

    expect(screen.getByText(formatDay('2026-08-15'))).toBeTruthy();
    expect(screen.queryByTestId('CancelIcon')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save leaves & holidays' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Add a leave date' })).toHaveProperty('disabled', true);
  });
});
