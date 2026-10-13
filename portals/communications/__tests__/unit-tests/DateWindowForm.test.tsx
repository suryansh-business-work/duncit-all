import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { DateWindowForm } from '../../src/pages/msg91-otp/date-window';

const mount = (initial = { start: '2026-08-01', end: '2026-08-03' }, maxDays = 5) => {
  const onSubmit = vi.fn();
  renderWithProviders(<DateWindowForm initial={initial} maxDays={maxDays} busy={false} onSubmit={onSubmit} />);
  return onSubmit;
};

/** The picker's own text value, which MUI X keeps in a hidden input. */
const dayInputs = () =>
  Array.from(screen.getByTestId('msg91-date-window').querySelectorAll<HTMLInputElement>('input'));
const [START, END] = [0, 1];
/** The picker groups MUI X marks invalid after a failed validation. */
const invalidFields = () =>
  screen.getAllByRole('group').filter((g) => g.getAttribute('aria-invalid') === 'true');
const load = () => fireEvent.click(screen.getByRole('button', { name: /load/i }));

describe('DateWindowForm', () => {
  it('submits the window it was opened with as yyyy-MM-dd strings', async () => {
    const onSubmit = mount();
    load();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ start: '2026-08-01', end: '2026-08-03' });
  });

  it('shows a day it was not given as an empty field rather than inventing one', () => {
    mount({ start: '', end: '2026-08-03' });
    expect(dayInputs()[START].value).toBe('');
    expect(dayInputs()[END].value).toBe('08/03/2026');
  });

  it('writes a picked day back as yyyy-MM-dd', async () => {
    const onSubmit = mount();
    fireEvent.change(dayInputs()[END], { target: { value: '08/04/2026' } });
    load();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ start: '2026-08-01', end: '2026-08-04' });
  });

  it('blocks the submit and says so when a day is cleared', async () => {
    const onSubmit = mount();
    fireEvent.change(dayInputs()[START], { target: { value: '' } });
    load();
    await waitFor(() => expect(invalidFields()).toHaveLength(1));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks the submit when the window is wider than the limit', async () => {
    const onSubmit = mount({ start: '2026-08-01', end: '2026-08-03' }, 2);
    fireEvent.change(dayInputs()[END], { target: { value: '08/04/2026' } });
    load();
    await waitFor(() => expect(invalidFields().length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
