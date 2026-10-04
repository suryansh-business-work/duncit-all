import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FormatFields from '../DisplayFormatsSection/FormatFields';

const renderFields = (dateFmt = 'dd/MM/yyyy', timeFmt = 'HH:mm') => {
  const setDateFmt = vi.fn();
  const setTimeFmt = vi.fn();
  render(
    <FormatFields
      dateFmt={dateFmt}
      timeFmt={timeFmt}
      setDateFmt={setDateFmt}
      setTimeFmt={setTimeFmt}
    />,
  );
  return { setDateFmt, setTimeFmt };
};

const openPreset = (name: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  return within(screen.getByRole('listbox')).getAllByRole('option');
};

describe('FormatFields', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows off-list patterns as "Custom pattern…" and applies a picked time preset', () => {
    const { setTimeFmt } = renderFields('d.M.yy', 'H.mm');

    expect(screen.getByRole('combobox', { name: 'Date format' })).toHaveTextContent(
      'Custom pattern…',
    );
    expect(screen.getByRole('combobox', { name: 'Time format' })).toHaveTextContent(
      'Custom pattern…',
    );
    fireEvent.click(openPreset('Time format')[0]);

    expect(setTimeFmt).toHaveBeenCalledWith('hh:mm a');
  });

  it('keeps the current time pattern when "Custom pattern…" is picked, instead of writing the sentinel', () => {
    const { setTimeFmt } = renderFields('dd/MM/yyyy', 'HH:mm');

    openPreset('Time format');
    fireEvent.click(
      within(screen.getByRole('listbox')).getByRole('option', { name: 'Custom pattern…' }),
    );

    expect(setTimeFmt).toHaveBeenCalledWith('HH:mm');
    expect(setTimeFmt).not.toHaveBeenCalledWith('__custom__');
  });

  it('applies a picked date preset, and the date "Custom pattern…" row keeps the current one', () => {
    const { setDateFmt } = renderFields('dd/MM/yyyy', 'HH:mm');

    fireEvent.click(openPreset('Date format')[3]);
    expect(setDateFmt).toHaveBeenLastCalledWith('yyyy-MM-dd');

    openPreset('Date format');
    fireEvent.click(
      within(screen.getByRole('listbox')).getByRole('option', { name: 'Custom pattern…' }),
    );
    expect(setDateFmt).toHaveBeenLastCalledWith('dd/MM/yyyy');
    expect(setDateFmt).not.toHaveBeenCalledWith('__custom__');
  });

  it('lists every preset with an empty sample instead of crashing when the clock is unreadable', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Number.NaN));
    renderFields();

    expect(openPreset('Date format').map((o) => o.textContent)).toEqual([
      'dd MMM yyyy — ',
      'dd/MM/yyyy — ',
      'MM/dd/yyyy — ',
      'yyyy-MM-dd — ',
      'EEE, dd MMM yyyy — ',
      'Custom pattern…',
    ]);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    expect(openPreset('Time format').map((o) => o.textContent)).toEqual([
      'hh:mm a — ',
      'HH:mm — ',
      'h:mm a — ',
      'HH:mm:ss — ',
      'Custom pattern…',
    ]);
  });

  it('writes typed patterns straight through', () => {
    const { setDateFmt, setTimeFmt } = renderFields();

    fireEvent.change(screen.getByLabelText('Date pattern (date-fns)'), {
      target: { value: 'd MMM' },
    });
    fireEvent.change(screen.getByLabelText('Time pattern (date-fns)'), {
      target: { value: 'H:mm' },
    });

    expect(setDateFmt).toHaveBeenCalledWith('d MMM');
    expect(setTimeFmt).toHaveBeenCalledWith('H:mm');
  });
});
