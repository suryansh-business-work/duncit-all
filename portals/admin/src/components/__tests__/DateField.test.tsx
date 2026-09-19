import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DateField from '../DateField';

/**
 * Same approach as DateTimeField.test.tsx: MUI X's sectioned field cannot be
 * typed into under jsdom, so the picker is replaced by a stub that records the
 * props it was handed and fires the three values a real DatePicker emits — a
 * picked day, a cleared field (null) and a half-typed one (an Invalid Date).
 */
const pickerMock = vi.hoisted(() => ({ lastProps: null as Record<string, any> | null }));
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: Record<string, any>) => {
    pickerMock.lastProps = props;
    return (
      <div data-testid="picker">
        <button type="button" onClick={() => props.onChange(new Date(2026, 8, 2, 23, 30))}>
          pick-day
        </button>
        <button type="button" onClick={() => props.onChange(null)}>
          clear-day
        </button>
        <button type="button" onClick={() => props.onChange(new Date('not-a-date'))}>
          half-typed-day
        </button>
      </div>
    );
  },
}));

const pickerProps = () => {
  if (!pickerMock.lastProps) throw new Error('DatePicker was not rendered');
  return pickerMock.lastProps;
};

afterEach(() => {
  pickerMock.lastProps = null;
});

describe('DateField — value parsing', () => {
  it('hands the picker null for an empty or unparsable value', () => {
    const { rerender } = render(<DateField label="Date of birth" value="" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeNull();

    rerender(<DateField label="Date of birth" value="31/31/2026" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeNull();
  });

  it('hands the picker a Date for a stored YYYY-MM-DD value', () => {
    render(<DateField label="Date of birth" value="1995-04-02" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeInstanceOf(Date);
    expect(pickerProps().label).toBe('Date of birth');
  });
});

describe('DateField — onChange mapping', () => {
  it('reports the picked day as a local YYYY-MM-DD, whatever the time of day', () => {
    const onChange = vi.fn();
    render(<DateField label="From" value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('pick-day'));
    expect(onChange).toHaveBeenCalledWith('2026-09-02');
  });

  it('reports a cleared field as an empty string', () => {
    const onChange = vi.fn();
    render(<DateField label="From" value="2026-09-02" onChange={onChange} />);
    fireEvent.click(screen.getByText('clear-day'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('reports a half-typed (invalid) day as an empty string', () => {
    const onChange = vi.fn();
    render(<DateField label="From" value="2026-09-02" onChange={onChange} />);
    fireEvent.click(screen.getByText('half-typed-day'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('DateField — bounds and field props', () => {
  it('forwards min and max dates when given', () => {
    const min = new Date(2026, 0, 1);
    const max = new Date(2026, 11, 31);
    render(<DateField label="To" value="" onChange={vi.fn()} minDate={min} maxDate={max} />);
    expect(pickerProps().minDate).toBe(min);
    expect(pickerProps().maxDate).toBe(max);
  });

  it('leaves the bounds undefined when they are omitted or null', () => {
    render(<DateField label="To" value="" onChange={vi.fn()} minDate={null} maxDate={null} />);
    expect(pickerProps().minDate).toBeUndefined();
    expect(pickerProps().maxDate).toBeUndefined();
  });

  it('assembles the text field props, full width by default', () => {
    render(
      <DateField
        label="To"
        value=""
        onChange={vi.fn()}
        required
        error
        helperText="Pick a day"
        size="small"
        disabled
      />,
    );
    expect(pickerProps().disabled).toBe(true);
    expect(pickerProps().slotProps.textField).toEqual({
      fullWidth: true,
      required: true,
      error: true,
      helperText: 'Pick a day',
      size: 'small',
    });
  });

  it('honours an explicit fullWidth of false', () => {
    render(<DateField label="To" value="" onChange={vi.fn()} fullWidth={false} />);
    expect(pickerProps().slotProps.textField.fullWidth).toBe(false);
  });
});
