import { describe, expect, it, vi } from 'vitest';
import { useMemo } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@duncit/app-settings';
import { makeBookingOffersSchema, type BookingOffersValues } from '@duncit/forms/schemas';
import MinSpendField from '../src/offers/settings/MinSpendField';

/** Fees & Minimum Spend's booking-offers form, cut down to the minimum spend, under its own rules. */
function MinSpendForm({ minSpend, disabled, onSubmit }: Readonly<{ minSpend: string; disabled?: boolean; onSubmit: (v: BookingOffersValues) => void }>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeBookingOffersSchema(t), [t]);
  const { control, handleSubmit } = useForm<BookingOffersValues>({
    resolver: zodResolver(schema),
    defaultValues: { min_guests: '', response_hours: '', min_business: [{ model: 'FLAT', amount: '900' }], min_spend: minSpend },
  });
  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <MinSpendField control={control} idPrefix="offers" disabled={disabled} />
      <button type="submit">Save</button>
    </form>
  );
}

const renderField = (minSpend: string, disabled?: boolean) => {
  const onSubmit = vi.fn();
  render(<MinSpendForm minSpend={minSpend} disabled={disabled} onSubmit={onSubmit} />);
  return { onSubmit, field: screen.getByLabelText('Minimum spend per booking (₹)') };
};

describe('MinSpendField', () => {
  it('shows the stored minimum spend with a hint that an offer below it cannot be sent', () => {
    const { field } = renderField('4500');
    expect(field).toHaveValue(4500);
    expect(screen.getByText(/A host cannot send an offer below it\. 0 means no minimum\./)).toBeInTheDocument();
  });

  it('saves the amount the owner types', async () => {
    const { field, onSubmit } = renderField('0');
    fireEvent.change(field, { target: { value: '6200.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].min_spend).toBe('6200.5');
  });

  it('refuses a negative amount with its message, and saves nothing', async () => {
    const { field, onSubmit } = renderField('0');
    fireEvent.change(field, { target: { value: '-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Enter an amount from 0 to/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('is locked while the form saves', () => {
    expect(renderField('100', true).field).toBeDisabled();
  });
});
