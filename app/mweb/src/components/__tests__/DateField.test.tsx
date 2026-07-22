import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import DateField from '../DateField';

function Harness({
  initialValue = '',
  onChange,
  ...rest
}: Readonly<{
  initialValue?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  minDate?: Date | null;
  maxDate?: Date | null;
  disabled?: boolean;
  size?: 'small' | 'medium';
  onBlur?: () => void;
}>) {
  const [value, setValue] = useState(initialValue);
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DateField
        label="Event date"
        value={value}
        onChange={(iso) => {
          setValue(iso);
          onChange?.(iso);
        }}
        {...rest}
      />
      <span data-testid="value">{value}</span>
    </LocalizationProvider>
  );
}

describe('DateField', () => {
  it('renders the labelled picker with an empty value', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/event date/i)).toHaveValue('');
  });

  it('seeds the input from an existing ISO value', () => {
    render(<Harness initialValue="2024-03-15" />);
    expect(screen.getByLabelText(/event date/i)).toHaveValue('03/15/2024');
  });

  it('ignores an invalid ISO value (treats it as empty)', () => {
    render(<Harness initialValue="not-a-date" />);
    expect(screen.getByLabelText(/event date/i)).toHaveValue('');
  });

  it('emits a YYYY-MM-DD string when a day is picked from the calendar', () => {
    const onChange = vi.fn();
    render(<Harness initialValue="2024-03-15" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('gridcell', { name: '20' }));
    expect(onChange).toHaveBeenCalledWith('2024-03-20');
    expect(screen.getByTestId('value')).toHaveTextContent('2024-03-20');
  });

  it('renders error state with helper text and applies required + size', () => {
    render(
      <Harness
        error
        required
        helperText="Date is required"
        size="small"
      />,
    );
    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/event date/i)).toBeInvalid();
  });

  it('respects the disabled prop', () => {
    render(<Harness disabled />);
    expect(screen.getByLabelText(/event date/i)).toBeDisabled();
  });

  it('honours minDate / maxDate bounds when picking', () => {
    const onChange = vi.fn();
    render(
      <Harness
        initialValue="2024-03-15"
        onChange={onChange}
        minDate={new Date('2024-03-10')}
        maxDate={new Date('2024-03-25')}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));
    const dialog = screen.getByRole('dialog');
    // A day outside the max bound is disabled.
    expect(within(dialog).getByRole('gridcell', { name: '28' })).toBeDisabled();
  });

  it('fires onBlur when the input loses focus', () => {
    const onBlur = vi.fn();
    render(<Harness onBlur={onBlur} />);
    const input = screen.getByLabelText(/event date/i);
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
  });
});
