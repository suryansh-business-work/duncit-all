import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import DateTimeField from '../../src/components/DateTimeField';
import { renderWithProviders } from '../testkit';

const picker = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));

// Stub the MUI X DateTimePicker (a third-party component that needs a
// LocalizationProvider) with a probe that captures the props DateTimeField
// computes and lets us drive its onChange in both directions.
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: (props: Record<string, any>) => {
    picker.props = props;
    return <div data-testid="picker" data-format={props.format} />;
  },
}));

describe('DateTimeField', () => {
  it('parses a valid ISO value and emits ISO strings on change', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <DateTimeField label="Published at" value="2026-01-15T10:30:00.000Z" onChange={onChange} required />,
    );
    // Valid date passed straight through to the picker.
    expect(picker.props.value).toBeInstanceOf(Date);
    expect(picker.props.slotProps.textField.required).toBe(true);
    expect(picker.props.slotProps.textField.fullWidth).toBe(true);

    const next = new Date('2026-02-01T09:00:00.000Z');
    picker.props.onChange(next);
    expect(onChange).toHaveBeenLastCalledWith(next.toISOString());

    picker.props.onChange(null);
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('treats an empty value as no date and honours minDateTime', () => {
    const min = new Date('2026-01-01T00:00:00.000Z');
    renderWithProviders(
      <DateTimeField
        label="From"
        value=""
        onChange={vi.fn()}
        minDateTime={min}
        fullWidth={false}
        error
        helperText="bad"
        disabled
      />,
    );
    expect(picker.props.value).toBeNull();
    expect(picker.props.minDateTime).toBe(min);
    expect(picker.props.disabled).toBe(true);
    expect(picker.props.slotProps.textField.fullWidth).toBe(false);
    expect(picker.props.slotProps.textField.error).toBe(true);
    expect(picker.props.slotProps.textField.helperText).toBe('bad');
  });

  it('treats an unparseable value as no date and omits minDateTime', () => {
    renderWithProviders(<DateTimeField label="X" value="not-a-real-date" onChange={vi.fn()} />);
    expect(picker.props.value).toBeNull();
    expect(picker.props.minDateTime).toBeUndefined();
    // The combined date+time pattern still renders.
    expect(screen.getByTestId('picker').getAttribute('data-format')).toContain(' ');
  });
});
