import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DateField from './DateField';

/**
 * MUI X's sectioned field cannot be typed into under jsdom, so the picker is a
 * stub that records the props it was handed and fires the three values a real
 * DatePicker emits — a picked day, a cleared field (null) and a half-typed one
 * (an Invalid Date).
 */
const pickerMock = vi.hoisted(() => ({ lastProps: null as Record<string, any> | null }));
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: Record<string, any>) => {
    pickerMock.lastProps = props;
    return (
      <div data-testid="picker">
        <button type="button" onClick={() => props.onChange(new Date(2026, 0, 5, 23, 30))}>
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
  cleanup();
  pickerMock.lastProps = null;
});

describe('DateField — value parsing', () => {
  it('hands the picker null for an empty or unparsable value', () => {
    const { rerender } = render(<DateField label="Owner date of birth" value="" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeNull();

    rerender(<DateField label="Owner date of birth" value="31/31/2026" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeNull();
  });

  it('hands the picker a Date for a stored YYYY-MM-DD value', () => {
    render(<DateField label="Owner date of birth" value="1990-05-10" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeInstanceOf(Date);
    expect(pickerProps().label).toBe('Owner date of birth');
  });
});

describe('DateField — onChange mapping', () => {
  it('reports the picked day as a zero-padded YYYY-MM-DD, whatever the time of day', () => {
    const onChange = vi.fn();
    render(<DateField label="From" value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('pick-day'));
    expect(onChange).toHaveBeenCalledWith('2026-01-05');
  });

  it('reports a cleared field as an empty string', () => {
    const onChange = vi.fn();
    render(<DateField label="From" value="2026-01-05" onChange={onChange} />);
    fireEvent.click(screen.getByText('clear-day'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('reports a half-typed (invalid) day as an empty string', () => {
    const onChange = vi.fn();
    render(<DateField label="From" value="2026-01-05" onChange={onChange} />);
    fireEvent.click(screen.getByText('half-typed-day'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('DateField — bounds and field props', () => {
  it('forwards min and max dates when given', () => {
    const minDate = new Date(2026, 0, 1);
    const maxDate = new Date(2026, 11, 31);
    render(<DateField label="From" value="" onChange={vi.fn()} minDate={minDate} maxDate={maxDate} />);
    expect(pickerProps().minDate).toBe(minDate);
    expect(pickerProps().maxDate).toBe(maxDate);
  });

  it('leaves the bounds open when they are null', () => {
    render(<DateField label="From" value="" onChange={vi.fn()} minDate={null} maxDate={null} />);
    expect(pickerProps().minDate).toBeUndefined();
    expect(pickerProps().maxDate).toBeUndefined();
  });

  it('passes the field props through to the text field, full width by default', () => {
    const onBlur = vi.fn();
    render(
      <DateField
        label="From"
        value=""
        onChange={vi.fn()}
        required
        error
        helperText="Used for identity checks"
        size="small"
        disabled
        onBlur={onBlur}
      />
    );
    expect(pickerProps().disabled).toBe(true);
    expect(pickerProps().slotProps.textField).toEqual({
      fullWidth: true,
      required: true,
      error: true,
      helperText: 'Used for identity checks',
      size: 'small',
      onBlur,
    });
  });
});
