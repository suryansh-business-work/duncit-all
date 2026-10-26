import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { notifySuccess } from '@duncit/dialogs';
import { OpeningHoursForm, buildOpeningHoursSchema, openingHoursValues, toOpeningHoursInput } from '.';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type SentOperation } from '../../../__tests__/groupC-link';

/**
 * MUI X's sectioned time field cannot be typed into under jsdom, so the picker
 * is a stub that fires what a real TimePicker emits: a picked time, a cleared
 * field (null) or an Invalid Date while a time is only half typed.
 */
vi.mock(import('@mui/x-date-pickers/TimePicker'), async () => ({
  TimePicker: (({
    label,
    value,
    onChange,
    slotProps,
  }: Readonly<{
    label: string;
    value: Date;
    onChange: (next: Date | null) => void;
    slotProps: { textField: { helperText: string; 'data-testid': string } };
  }>) => (
    <fieldset aria-label={label} data-testid={slotProps.textField['data-testid']}>
      <output>{`${label}=${value.getHours()}:${String(value.getMinutes()).padStart(2, '0')}`}</output>
      <button type="button" onClick={() => onChange(new Date(2026, 0, 1, 7, 5))}>{`${label} 07:05`}</button>
      <button type="button" onClick={() => onChange(new Date(2026, 0, 1, 20, 30))}>{`${label} 20:30`}</button>
      <button type="button" onClick={() => onChange(null)}>{`${label} clear`}</button>
      <button type="button" onClick={() => onChange(new Date('nope'))}>{`${label} half`}</button>
      <small>{slotProps.textField.helperText}</small>
    </fieldset>
  )) as never,
}));

vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(notifySuccess).mockClear();
});

const mount = (
  settings: Parameters<typeof OpeningHoursForm>[0]['settings'],
  answer: Record<string, unknown> | Error = { updateVenueSettings: { __typename: 'Venue', id: 'v1', settings: null } },
) => {
  const sent: SentOperation[] = [];
  const onSaved = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(<OpeningHoursForm venueId="v1" settings={settings} onSaved={onSaved} />, {
    link: scriptedLink({ UpdateVenueSettings: answer }, sent),
  });
  return { sent, onSaved };
};

const writes = (sent: SentOperation[]) => sent.filter((op) => op.name === 'UpdateVenueSettings');
const save = () => screen.getByTestId('opening-hours-save');

describe('opening hours values', () => {
  it('falls back to the server default window and sorts the weekly off days', () => {
    expect(openingHoursValues(null)).toEqual({ open: '09:00', close: '23:00', weekly_off_days: [] });
    expect(
      openingHoursValues({ operating_hours: { open: '', close: '22:00' }, weekly_off_days: [6, 0, 3] }),
    ).toEqual({ open: '09:00', close: '22:00', weekly_off_days: [0, 3, 6] });
  });

  it('sends only the two fields the form owns, off days sorted', () => {
    expect(toOpeningHoursInput({ open: '08:00', close: '18:00', weekly_off_days: [5, 1] })).toEqual({
      operating_hours: { open: '08:00', close: '18:00' },
      weekly_off_days: [1, 5],
    });
  });

  it('refuses a missing time and a close that is not after the open', () => {
    const schema = buildOpeningHoursSchema((key) => key);
    const missing = schema.safeParse({ open: '', close: '18:00', weekly_off_days: [] });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.message).toBe('partners.venueSetup.timeRequired');
    const backwards = schema.safeParse({ open: '18:00', close: '09:00', weekly_off_days: [] });
    expect(backwards.error?.issues[0]).toMatchObject({
      message: 'partners.venueSetup.closeAfterOpen',
      path: ['close'],
    });
    expect(schema.safeParse({ open: '09:00', close: '18:00', weekly_off_days: [0, 6] }).success).toBe(true);
  });
});

describe('OpeningHoursForm', () => {
  it('shows the saved window and keeps Save disabled until something changes', () => {
    mount({ operating_hours: { open: '08:30', close: '21:00' }, weekly_off_days: [2] });
    expect(screen.getByText('Opens at=8:30')).toBeTruthy();
    expect(screen.getByText('Closes at=21:00')).toBeTruthy();
    expect(screen.getByTestId('opening-hours-off-2').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('opening-hours-off-3').getAttribute('aria-pressed')).toBe('false');
    expect(save().hasAttribute('disabled')).toBe(true);
  });

  it('saves a picked window and toggled off days, then refreshes and confirms', async () => {
    const { sent, onSaved } = mount({ operating_hours: { open: '09:00', close: '23:00' }, weekly_off_days: [2] });
    fireEvent.click(screen.getByRole('button', { name: 'Opens at 07:05' }));
    fireEvent.click(screen.getByRole('button', { name: 'Closes at 20:30' }));
    fireEvent.click(screen.getByTestId('opening-hours-off-0'));
    fireEvent.click(screen.getByTestId('opening-hours-off-2'));
    expect(screen.getByTestId('opening-hours-off-0').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('opening-hours-off-2').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(save());

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Saved.'));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(writes(sent).at(-1)).toEqual({
      name: 'UpdateVenueSettings',
      variables: {
        venue_doc_id: 'v1',
        input: { operating_hours: { open: '07:05', close: '20:30' }, weekly_off_days: [0] },
      },
    });
  });

  it('blocks a save whose closing time is not after opening and says why', async () => {
    const { sent } = mount({ operating_hours: { open: '09:00', close: '23:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Closes at 07:05' }));
    fireEvent.click(save());
    expect(await screen.findByText('Closing time must be after opening time')).toBeTruthy();
    expect(writes(sent)).toHaveLength(0);
  });

  it('treats a cleared or half-typed time as missing', async () => {
    const { sent } = mount(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Opens at clear' }));
    fireEvent.click(save());
    expect(await screen.findByText('Pick a time')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Opens at 07:05' }));
    fireEvent.click(screen.getByRole('button', { name: 'Closes at half' }));
    fireEvent.click(save());
    await waitFor(() => expect(screen.getAllByText('Pick a time').length).toBeGreaterThan(0));
    expect(writes(sent)).toHaveLength(0);
  });

  it('shows the server error and does not report the save', async () => {
    const { onSaved } = mount({ operating_hours: { open: '09:00', close: '23:00' } }, new Error('Venue is locked'));
    fireEvent.click(screen.getByTestId('opening-hours-off-1'));
    fireEvent.click(save());
    expect(await screen.findByText('Venue is locked')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('OpeningHoursForm without a server message', () => {
  it('says the save failed in its own words and confirms nothing', async () => {
    mount({ operating_hours: { open: '09:00', close: '23:00' } }, new Error(''));
    fireEvent.click(screen.getByTestId('opening-hours-off-1'));
    fireEvent.click(save());
    expect(await screen.findByText('Could not save. Try again.')).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
