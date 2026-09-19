import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LocalDateTimeField from '../LocalDateTimeField';

/** Stubbed for the same reason as DateTimeField.test.tsx — see the comment there. */
const pickerMock = vi.hoisted(() => ({ lastProps: null as Record<string, any> | null }));
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: (props: Record<string, any>) => {
    pickerMock.lastProps = props;
    return (
      <div data-testid="picker">
        <button type="button" onClick={() => props.onChange(new Date(2026, 9, 24, 18, 5))}>
          pick-moment
        </button>
        <button type="button" onClick={() => props.onChange(null)}>
          clear-moment
        </button>
      </div>
    );
  },
}));

const pickerProps = () => {
  if (!pickerMock.lastProps) throw new Error('DateTimePicker was not rendered');
  return pickerMock.lastProps;
};

afterEach(() => {
  pickerMock.lastProps = null;
});

describe('LocalDateTimeField', () => {
  it('reads a stored local YYYY-MM-DDTHH:mm into a Date for the picker', () => {
    render(<LocalDateTimeField label="Starts at" value="2026-10-24T18:05" onChange={vi.fn()} />);
    const value = pickerProps().value as Date;
    expect(value).toBeInstanceOf(Date);
    expect([value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes()]).toEqual([
      2026, 9, 24, 18, 5,
    ]);
  });

  it('hands the picker null while the value is blank', () => {
    render(<LocalDateTimeField label="Starts at" value="" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeNull();
  });

  it('writes a picked moment back in the same local YYYY-MM-DDTHH:mm shape', () => {
    const onChange = vi.fn();
    render(<LocalDateTimeField label="Starts at" value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('pick-moment'));
    expect(onChange).toHaveBeenCalledWith('2026-10-24T18:05');
  });

  it('writes an empty string when the field is cleared', () => {
    const onChange = vi.fn();
    render(<LocalDateTimeField label="Ends at" value="2026-10-24T18:05" onChange={onChange} />);
    fireEvent.click(screen.getByText('clear-moment'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('passes the error state and hint through to the text field', () => {
    render(
      <LocalDateTimeField label="Ends at" value="" onChange={vi.fn()} error helperText="Ends before it starts" />,
    );
    expect(pickerProps().slotProps.textField).toEqual({
      fullWidth: true,
      error: true,
      helperText: 'Ends before it starts',
    });
  });
});
