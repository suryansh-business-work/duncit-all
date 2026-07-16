import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type UseFormReturn } from 'react-hook-form';
import DateTimeField from '../../src/components/DateTimeField';
import type { PodFormValues } from '../../src/types';

vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ label, value, onChange, minDateTime, format, slotProps }: any) => (
    <div>
      <span>{label}</span>
      <span data-testid="min">{minDateTime?.toISOString()}</span>
      <span data-testid="format">{format ?? 'none'}</span>
      <span data-testid="required">{String(!!slotProps?.textField?.required)}</span>
      <span data-testid="error">{String(!!slotProps?.textField?.error)}</span>
      <span data-testid="helper">{slotProps?.textField?.helperText ?? ''}</span>
      <span data-testid="value">{value ? value.toISOString() : ''}</span>
      <button type="button" onClick={() => onChange(new Date('2031-05-06T09:00:00.000Z'))}>
        set {label}
      </button>
    </div>
  ),
}));

const MIN = new Date('2030-01-01T00:00:00.000Z');

function Wrapper({
  required,
  format,
  methodsRef,
}: Readonly<{
  required?: boolean;
  format?: string;
  methodsRef?: { current: UseFormReturn<PodFormValues> | null };
}>) {
  const methods = useForm<PodFormValues>({ defaultValues: { pod_date_time: null } as PodFormValues });
  if (methodsRef) methodsRef.current = methods;
  return (
    <DateTimeField
      control={methods.control}
      name="pod_date_time"
      label="Start"
      minDateTime={MIN}
      required={required}
      format={format}
    />
  );
}

describe('DateTimeField', () => {
  it('passes label, minDateTime, format and required through to the picker', () => {
    render(<Wrapper required format="dd/MM/yyyy" />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByTestId('min')).toHaveTextContent(MIN.toISOString());
    expect(screen.getByTestId('format')).toHaveTextContent('dd/MM/yyyy');
    expect(screen.getByTestId('required')).toHaveTextContent('true');
  });

  it('writes the picked date back into the RHF field', async () => {
    const user = userEvent.setup();
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(<Wrapper methodsRef={methodsRef} />);
    await user.click(screen.getByRole('button', { name: 'set Start' }));
    expect(methodsRef.current?.getValues('pod_date_time')?.toISOString()).toBe(
      '2031-05-06T09:00:00.000Z',
    );
  });

  it('surfaces the field error message', () => {
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(<Wrapper methodsRef={methodsRef} />);
    act(() => {
      methodsRef.current?.setError('pod_date_time', { type: 'custom', message: 'Start required' });
    });
    expect(screen.getByTestId('error')).toHaveTextContent('true');
    expect(screen.getByTestId('helper')).toHaveTextContent('Start required');
  });
});
