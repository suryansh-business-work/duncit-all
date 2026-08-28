import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DateTimeField from '../DateTimeField';

/**
 * MUI X's `DateTimePicker` renders a sectioned (day/month/year/hour/minute)
 * contenteditable field with no single accessible "value" — simulating real
 * keyboard entry into it under jsdom is exactly the kind of MUI-internals
 * fight `AppShell.test.tsx` avoids by mocking `@duncit/shell`'s `AppShell`
 * (see its comment). The behaviour that is actually THIS file's own —
 * mapping an ISO string to a `Date | null`, mapping the picker's `Date | null`
 * callback back to an ISO string, and assembling `slotProps.textField` — is
 * tested directly against the props this component hands to the picker.
 */
const pickerMock = vi.hoisted(() => ({ lastProps: null as Record<string, any> | null }));
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: (props: Record<string, any>) => {
    pickerMock.lastProps = props;
    return (
      <div data-testid="picker">
        <span data-testid="picker-label">{props.label}</span>
        <button onClick={() => props.onChange(new Date('2026-09-02T10:30:00.000Z'))}>
          set-date
        </button>
        <button onClick={() => props.onChange(null)}>clear-date</button>
      </div>
    );
  },
}));

/** The props handed to the mocked picker by the most recent render. */
const pickerProps = () => {
  if (!pickerMock.lastProps) throw new Error('DateTimePicker was not rendered');
  return pickerMock.lastProps;
};

afterEach(() => {
  pickerMock.lastProps = null;
});

describe('DateTimeField — value parsing', () => {
  it('passes null to the picker when value is an empty string', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeNull();
  });

  it('passes null to the picker when value cannot be parsed as a date', () => {
    render(<DateTimeField label="Starts at" value="not-a-date" onChange={vi.fn()} />);
    expect(pickerProps().value).toBeNull();
  });

  it('passes a Date to the picker for a valid ISO value', () => {
    render(
      <DateTimeField label="Starts at" value="2026-09-02T10:30:00.000Z" onChange={vi.fn()} />
    );
    expect(pickerProps().value).toBeInstanceOf(Date);
    expect(pickerProps().value.toISOString()).toBe('2026-09-02T10:30:00.000Z');
  });

  it('forwards the label to the picker', () => {
    render(<DateTimeField label="Ends at" value="" onChange={vi.fn()} />);
    expect(screen.getByTestId('picker-label')).toHaveTextContent('Ends at');
  });
});

describe('DateTimeField — onChange mapping', () => {
  it('converts a picked date to an ISO string', () => {
    const onChange = vi.fn();
    render(<DateTimeField label="Starts at" value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('set-date'));
    expect(onChange).toHaveBeenCalledWith('2026-09-02T10:30:00.000Z');
  });

  it('converts a cleared date to an empty string', () => {
    const onChange = vi.fn();
    render(
      <DateTimeField label="Starts at" value="2026-09-02T10:30:00.000Z" onChange={onChange} />
    );
    fireEvent.click(screen.getByText('clear-date'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('DateTimeField — minDateTime', () => {
  it('forwards a given minDateTime unchanged', () => {
    const min = new Date('2026-01-01T00:00:00.000Z');
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} minDateTime={min} />);
    expect(pickerProps().minDateTime).toBe(min);
  });

  it('passes undefined when minDateTime is omitted', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} />);
    expect(pickerProps().minDateTime).toBeUndefined();
  });

  it('passes undefined when minDateTime is explicitly null', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} minDateTime={null} />);
    expect(pickerProps().minDateTime).toBeUndefined();
  });
});

describe('DateTimeField — disabled', () => {
  it('forwards disabled=true', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} disabled />);
    expect(pickerProps().disabled).toBe(true);
  });

  it('leaves disabled undefined when omitted', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} />);
    expect(pickerProps().disabled).toBeUndefined();
  });
});

describe('DateTimeField — slotProps.textField', () => {
  it('defaults fullWidth to true when omitted', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} />);
    expect(pickerProps().slotProps.textField.fullWidth).toBe(true);
  });

  it('honours an explicit fullWidth of false', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} fullWidth={false} />);
    expect(pickerProps().slotProps.textField.fullWidth).toBe(false);
  });

  it('forwards required, error and helperText', () => {
    render(
      <DateTimeField
        label="Starts at"
        value=""
        onChange={vi.fn()}
        required
        error
        helperText="Start time is required"
      />
    );
    expect(pickerProps().slotProps.textField).toMatchObject({
      required: true,
      error: true,
      helperText: 'Start time is required',
    });
  });

  it('leaves required, error and helperText undefined when omitted', () => {
    render(<DateTimeField label="Starts at" value="" onChange={vi.fn()} />);
    expect(pickerProps().slotProps.textField).toMatchObject({
      required: undefined,
      error: undefined,
      helperText: undefined,
    });
  });
});
