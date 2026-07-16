import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import DateField from '../../src/components/DateField';

const picker = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: Record<string, any>) => {
    picker.props = props;
    return <div data-testid="date-picker" />;
  },
}));
// useDateFormat hits Apollo; stub it to a fixed format so DateField renders solo.
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ dateFormat: 'dd MMM yyyy' }) }));

describe('DateField', () => {
  it('parses a valid ISO value into a Date and forwards the format', () => {
    render(<DateField label="Expiry" value="2026-05-20" onChange={vi.fn()} />);
    expect(picker.props?.format).toBe('dd MMM yyyy');
    expect(picker.props?.value).toBeInstanceOf(Date);
  });

  it('treats an empty or invalid value as null', () => {
    render(<DateField label="Expiry" value="" onChange={vi.fn()} />);
    expect(picker.props?.value).toBeNull();
    render(<DateField label="Expiry" value="not-a-date" onChange={vi.fn()} />);
    expect(picker.props?.value).toBeNull();
  });

  it('emits a yyyy-MM-dd string when a date is picked', () => {
    const onChange = vi.fn();
    render(<DateField label="Expiry" value="" onChange={onChange} />);
    picker.props?.onChange(new Date(2026, 0, 9)); // 9 Jan 2026
    expect(onChange).toHaveBeenCalledWith('2026-01-09');
  });

  it('emits an empty string when cleared or given an invalid date', () => {
    const onChange = vi.fn();
    render(<DateField label="Expiry" value="" onChange={onChange} />);
    picker.props?.onChange(null);
    expect(onChange).toHaveBeenLastCalledWith('');
    picker.props?.onChange(new Date('invalid'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('passes min/max dates and text field props through', () => {
    render(
      <DateField
        label="Expiry"
        value=""
        onChange={vi.fn()}
        required
        error
        helperText="pick one"
        size="small"
        minDate={new Date(2020, 0, 1)}
        maxDate={new Date(2030, 0, 1)}
        disabled
      />,
    );
    expect(picker.props?.minDate).toBeInstanceOf(Date);
    expect(picker.props?.maxDate).toBeInstanceOf(Date);
    expect(picker.props?.disabled).toBe(true);
    expect(picker.props?.slotProps.textField).toMatchObject({
      required: true,
      error: true,
      helperText: 'pick one',
      size: 'small',
      fullWidth: true,
    });
  });

  it('defaults min/max to undefined when not supplied', () => {
    render(<DateField label="Expiry" value="" onChange={vi.fn()} />);
    expect(picker.props?.minDate).toBeUndefined();
    expect(picker.props?.maxDate).toBeUndefined();
  });
});
