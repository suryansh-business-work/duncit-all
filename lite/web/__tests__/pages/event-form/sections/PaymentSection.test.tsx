import { useFormContext } from 'react-hook-form';
import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { emptyTicket, type EventFormValues } from '../../../../pages/event-form/event.types';
import { PaymentSection } from '../../../../pages/event-form/sections/PaymentSection';
import { renderInEventForm } from '../helpers';

function Payment() {
  const { control } = useFormContext<EventFormValues>();
  return <PaymentSection control={control} />;
}

describe('PaymentSection', () => {
  it('treats UPI as optional while every ticket is free', () => {
    renderInEventForm(<Payment />);
    expect(screen.getByTestId('payment-note')).toHaveTextContent('All tickets are free. Add a UPI ID only if you plan to charge.');
    expect(screen.getByRole('textbox', { name: 'UPI ID' })).not.toBeRequired();
  });

  it('asks for UPI once any ticket costs money', () => {
    renderInEventForm(<Payment />, { defaults: { tickets: [emptyTicket('Free'), { ...emptyTicket('Paid'), price: '300' }] } });
    expect(screen.getByTestId('payment-note')).toHaveTextContent('A ticket costs money, so a UPI ID is required.');
    expect(screen.getByRole('textbox', { name: /UPI ID/ })).toBeRequired();
  });

  it('follows a price change as it is typed', async () => {
    const { form } = renderInEventForm(<Payment />);
    await act(async () => {
      form().setValue('tickets.0.price', '99');
    });
    expect(screen.getByTestId('payment-note')).toHaveTextContent('A ticket costs money, so a UPI ID is required.');
  });

  it('takes the UPI ID and the payee name', async () => {
    const { user, form } = renderInEventForm(<Payment />);
    await user.type(screen.getByRole('textbox', { name: 'UPI ID' }), 'asha@okbank');
    await user.type(screen.getByRole('textbox', { name: 'Payee name' }), 'Asha Rao');
    expect(form().getValues('upi_id')).toBe('asha@okbank');
    expect(form().getValues('upi_name')).toBe('Asha Rao');
  });
});
