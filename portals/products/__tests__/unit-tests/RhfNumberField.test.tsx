import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import RhfNumberField from '../../src/pages/inventory-page/inventory-product-page/RhfNumberField';

function Harness({ hint }: Readonly<{ hint?: string }>) {
  const { control, watch } = useForm({ defaultValues: { qty: 5 } });
  return (
    <>
      <RhfNumberField control={control} name="qty" label="Qty" hint={hint} />
      <output data-testid="value">{String(watch('qty'))}</output>
    </>
  );
}

describe('RhfNumberField', () => {
  it('binds the numeric value and coerces input to a number', () => {
    render(<Harness hint="units" />);
    const input = screen.getByLabelText('Qty') as HTMLInputElement;
    expect(input.value).toBe('5');
    fireEvent.change(input, { target: { value: '12' } });
    expect(screen.getByTestId('value')).toHaveTextContent('12');
  });

  it('maps an empty input back to 0 and shows the hint', () => {
    render(<Harness hint="units" />);
    expect(screen.getByText('units')).toBeInTheDocument();
    const input = screen.getByLabelText('Qty') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByTestId('value')).toHaveTextContent('0');
  });

  it('falls back to a blank helper when no hint is given', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Qty')).toBeInTheDocument();
  });
});
