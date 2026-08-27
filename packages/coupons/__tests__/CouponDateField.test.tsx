/**
 * A coupon validity date: stores the 'YYYY-MM-DD' the API takes while the box
 * reads in the admin's pattern. The picker itself is MUI X's; what is under
 * test is the bridge between it and the form field.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CouponDateField from '../src/CouponDateField';
import type { CouponFormValues } from '../src/coupon';

vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: Record<string, any>) => (
    <div>
      <span data-testid="date-label">{props.label}</span>
      <span data-testid="date-value">
        {props.value ? `${props.value.getFullYear()}-${props.value.getMonth() + 1}-${props.value.getDate()}` : 'null'}
      </span>
      <span data-testid="date-helper">{props.slotProps?.textField?.helperText ?? ''}</span>
      <span data-testid="date-error">{String(props.slotProps?.textField?.error)}</span>
      <button onClick={() => props.onChange(new Date(2026, 8, 1))}>set-date</button>
      <button onClick={() => props.onChange(null)}>clear-date</button>
    </div>
  ),
}));

/** Hoisted harness: a real form around the field, with the stored value shown. */
function Harness({
  defaults,
  withError,
}: Readonly<{ defaults?: Partial<CouponFormValues>; withError?: boolean }>) {
  const form = useForm<CouponFormValues>(defaults ? { defaultValues: defaults } : undefined);
  useEffect(() => {
    if (withError) form.setError('valid_from', { type: 'manual', message: 'Pick a later day' });
  }, [form, withError]);
  return (
    <>
      <CouponDateField control={form.control} name="valid_from" label="Valid from" />
      <span data-testid="stored">{String(form.watch('valid_from'))}</span>
    </>
  );
}

describe('CouponDateField', () => {
  it('shows the picker with the label it was given', () => {
    render(<Harness defaults={{ valid_from: '' }} />);

    expect(screen.getByTestId('date-label')).toHaveTextContent('Valid from');
  });

  it('hands the picker no date for an open bound', () => {
    render(<Harness defaults={{ valid_from: '' }} />);

    expect(screen.getByTestId('date-value')).toHaveTextContent('null');
  });

  it('survives a form that has not registered the field yet', () => {
    render(<Harness />);

    expect(screen.getByTestId('date-value')).toHaveTextContent('null');
    expect(screen.getByTestId('stored')).toHaveTextContent('undefined');
  });

  it('reads a stored calendar day as that day, in whatever zone the admin sits', () => {
    render(<Harness defaults={{ valid_from: '2026-08-10' }} />);

    expect(screen.getByTestId('date-value')).toHaveTextContent('2026-8-10');
  });

  it('stores the picked day as YYYY-MM-DD', () => {
    render(<Harness defaults={{ valid_from: '' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'set-date' }));

    expect(screen.getByTestId('stored')).toHaveTextContent('2026-09-01');
    expect(screen.getByTestId('date-value')).toHaveTextContent('2026-9-1');
  });

  it('stores a cleared picker as an open bound', () => {
    render(<Harness defaults={{ valid_from: '2026-08-10' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'clear-date' }));

    expect(screen.getByTestId('stored')).toHaveTextContent('');
    expect(screen.getByTestId('date-value')).toHaveTextContent('null');
  });

  it('shows no error while the field is clean', () => {
    render(<Harness defaults={{ valid_from: '' }} />);

    expect(screen.getByTestId('date-error')).toHaveTextContent('false');
    expect(screen.getByTestId('date-helper')).toHaveTextContent('');
  });

  it('passes the field error into the picker box', () => {
    render(<Harness defaults={{ valid_from: '' }} withError />);

    expect(screen.getByTestId('date-error')).toHaveTextContent('true');
    expect(screen.getByTestId('date-helper')).toHaveTextContent('Pick a later day');
  });
});
