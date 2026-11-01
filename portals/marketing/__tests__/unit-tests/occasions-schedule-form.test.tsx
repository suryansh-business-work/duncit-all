import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { makeLook } from '../mocks/occasions-live.mock';

vi.mock('../../src/components/DateTimeField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).DateTimeFieldStub,
}));

import { ScheduleForm, scheduleValues, toScheduleInput } from '../../src/pages/occasions-page/schedule-form';

const DIWALI = makeLook();
const UNDATED = makeLook({ key: 'eid', name: 'Eid', starts_at: null, ends_at: null, schedule_enabled: false, sort_order: 0 });

const open = (look: typeof DIWALI | null, onSubmit = vi.fn().mockResolvedValue(true), onClose = vi.fn()) => {
  renderWithProviders(<ScheduleForm look={look} onClose={onClose} onSubmit={onSubmit} />);
  return { onSubmit, onClose };
};

const dialog = () => screen.getByRole('dialog', { name: /^Dates for/ });
/** Save comes on once the form has checked the change, as it does for a person; only then is it pressed. */
const save = async () => {
  const button = within(dialog()).getByRole('button', { name: 'Save' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
};

describe('scheduleValues / toScheduleInput', () => {
  it('reads a look with no dates as blanks, and sends blanks back as no date', () => {
    const values = scheduleValues(UNDATED);
    expect(values).toEqual({ starts_at: '', ends_at: '', sort_order: 0, schedule_enabled: false });
    expect(toScheduleInput(values)).toEqual({ starts_at: null, ends_at: null, sort_order: 0, schedule_enabled: false });
    expect(toScheduleInput(scheduleValues(DIWALI))).toEqual({
      starts_at: '2026-11-01T00:00:00.000Z',
      ends_at: '2026-11-05T00:00:00.000Z',
      sort_order: 10,
      schedule_enabled: true,
    });
  });
});

describe('ScheduleForm', () => {
  it('stays closed with no look', () => {
    open(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the look’s saved window, with Save off until something changes', () => {
    open(DIWALI);
    const d = dialog();
    expect(d).toHaveAccessibleName('Dates for Diwali');
    expect(within(d).getByLabelText('Starts')).toHaveValue('2026-11-01T00:00:00.000Z');
    expect(within(d).getByLabelText('Ends')).toHaveValue('2026-11-05T00:00:00.000Z');
    expect(within(d).getByLabelText(/^Priority/)).toHaveValue(10);
    expect(within(d).getByLabelText('Switch on by schedule')).toBeChecked();
    expect(within(d).getByText('Needs both dates, with the end after the start.')).toBeInTheDocument();
    expect(within(d).getByText('When two looks overlap, the higher number wins.')).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('asks for both dates before the schedule may switch a look on', async () => {
    const { onSubmit } = open(UNDATED);
    fireEvent.click(within(dialog()).getByLabelText('Switch on by schedule'));
    await save();
    expect(await screen.findByText('Set when the look starts.')).toBeInTheDocument();
    expect(screen.getByText('Set when the look ends.')).toBeInTheDocument();
    expect(screen.getByLabelText('Starts')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses an end at or before the start', async () => {
    const { onSubmit } = open(DIWALI);
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-11-01T00:00:00.000Z' } });
    expect(await screen.findByText('The end must be after the start.')).toBeInTheDocument();
    await save();
    await waitFor(() => expect(screen.getByLabelText('Ends')).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a priority that is not whole or outside the server’s range', async () => {
    open(DIWALI);
    const priority = screen.getByLabelText(/^Priority/);
    fireEvent.change(priority, { target: { value: '1.5' } });
    expect(await screen.findByText('Enter a whole number.')).toBeInTheDocument();
    fireEvent.change(priority, { target: { value: '1001' } });
    expect(await screen.findByText('Enter a number from -1000 to 1000.')).toBeInTheDocument();
    fireEvent.change(priority, { target: { value: '-1001' } });
    expect(await screen.findByText('Enter a number from -1000 to 1000.')).toBeInTheDocument();
    fireEvent.change(priority, { target: { value: '-1000' } });
    await waitFor(() => expect(screen.queryByText('Enter a number from -1000 to 1000.')).not.toBeInTheDocument());
  });

  it('clears the dates of a look switched off, sends no dates, and closes once saved', async () => {
    const { onSubmit, onClose } = open(DIWALI);
    fireEvent.click(screen.getByLabelText('Switch on by schedule'));
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '' } });
    await save();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith('diwali', { starts_at: null, ends_at: null, sort_order: 10, schedule_enabled: false }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('stays open when the save did not go through, and closes on Cancel', async () => {
    const { onSubmit, onClose } = open(DIWALI, vi.fn().mockResolvedValue(false));
    fireEvent.change(screen.getByLabelText(/^Priority/), { target: { value: '3' } });
    await save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('diwali', expect.objectContaining({ sort_order: 3 })));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
