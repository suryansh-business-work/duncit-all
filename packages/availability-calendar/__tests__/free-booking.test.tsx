import { describe, expect, it, vi } from 'vitest';
import { useMemo } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@duncit/app-settings';
import { makeBookingOffersSchema, type BookingOffersValues } from '@duncit/forms/schemas';
import FreeBookingField from '../src/offers/settings/FreeBookingField';

/** Fees & Minimum Spend's booking-offers form, cut down to the free-bookings switch, under its own rules. */
function FreeBookingForm({ open, disabled, onSubmit }: Readonly<{ open: boolean; disabled?: boolean; onSubmit: (v: BookingOffersValues) => void }>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeBookingOffersSchema(t), [t]);
  const { control, handleSubmit } = useForm<BookingOffersValues>({
    resolver: zodResolver(schema),
    defaultValues: { min_guests: '', response_hours: '', min_business: [{ model: 'FLAT', amount: '900' }], min_spend: '0', free_booking: open },
  });
  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <FreeBookingField control={control} idPrefix="offers" disabled={disabled} />
      <button type="submit">Save</button>
    </form>
  );
}

const LABEL = 'Your venue is open for free venue booking for initiatives';

const renderField = (open: boolean, disabled?: boolean) => {
  const onSubmit = vi.fn();
  render(<FreeBookingForm open={open} disabled={disabled} onSubmit={onSubmit} />);
  return { onSubmit, toggle: screen.getByRole('switch', { name: LABEL }) };
};

describe('FreeBookingField', () => {
  it('shows the stored switch, with a hint that a free booking is ₹0 with no commission or earnings', () => {
    expect(renderField(false).toggle).not.toBeChecked();
    expect(screen.getByTestId('offers-free-booking')).toBeInTheDocument();
    expect(screen.getByText(/A free booking is ₹0: no venue charges, no Duncit commission and no earnings/)).toBeInTheDocument();
  });

  it('reads a venue already open as on', () => {
    expect(renderField(true).toggle).toBeChecked();
  });

  it('saves the switch turned on, and off again', async () => {
    const { toggle, onSubmit } = renderField(false);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].free_booking).toBe(true);

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0].free_booking).toBe(false);
  });

  it('is locked while the form saves', () => {
    expect(renderField(true, true).toggle).toBeDisabled();
  });
});
