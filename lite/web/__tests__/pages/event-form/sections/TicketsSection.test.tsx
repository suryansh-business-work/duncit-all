import { useFormContext } from 'react-hook-form';
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventFormValues } from '../../../../pages/event-form/event.types';
import { TicketsSection } from '../../../../pages/event-form/sections/TicketsSection';
import { renderInEventForm } from '../helpers';

function Tickets() {
  const { control } = useFormContext<EventFormValues>();
  return <TicketsSection control={control} />;
}

describe('TicketsSection', () => {
  it('starts with the one ticket, which cannot be removed', () => {
    renderInEventForm(<Tickets />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Ticket name' })).toHaveValue('General admission');
    expect(screen.getByRole('textbox', { name: 'Price (₹)' })).toHaveValue('0');
    expect(screen.queryByRole('button', { name: 'Remove ticket' })).not.toBeInTheDocument();
  });

  it('adds a blank ticket and lets either be removed once there are two', async () => {
    const { user, form } = renderInEventForm(<Tickets />);
    await user.click(screen.getByRole('button', { name: 'Add ticket' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(form().getValues('tickets.1')).toEqual({ id: '', name: '', description: '', price: '0', quantity: '', sold: 0, is_active: true });

    const removes = screen.getAllByRole('button', { name: 'Remove ticket' });
    expect(removes).toHaveLength(2);
    await user.click(removes[0]);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(form().getValues('tickets')).toHaveLength(1);
    expect(form().getValues('tickets.0.name')).toBe('');
  });

  it('takes the price, quantity and description typed into a ticket', async () => {
    const { user, form } = renderInEventForm(<Tickets />);
    const row = screen.getByRole('listitem');
    await user.clear(within(row).getByRole('textbox', { name: 'Price (₹)' }));
    await user.type(within(row).getByRole('textbox', { name: 'Price (₹)' }), '350');
    await user.type(within(row).getByRole('textbox', { name: 'Quantity' }), '60');
    await user.type(within(row).getByRole('textbox', { name: 'Ticket description' }), 'Includes a drink');
    expect(form().getValues('tickets.0')).toMatchObject({ price: '350', quantity: '60', description: 'Includes a drink' });
  });

  it('takes a ticket off sale', async () => {
    const { user, form } = renderInEventForm(<Tickets />);
    const onSale = screen.getByRole('checkbox', { name: 'On sale' });
    expect(onSale).toBeChecked();
    await user.click(onSale);
    expect(form().getValues('tickets.0.is_active')).toBe(false);
  });

  it('shows each field’s problem under it', async () => {
    const { user, form } = renderInEventForm(<Tickets />);
    const price = screen.getByRole('textbox', { name: 'Price (₹)' });
    await user.clear(price);
    await user.type(price, '12.5');
    await act(async () => {
      await form().trigger('tickets');
    });
    expect(screen.getByText('Enter a whole number')).toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'true');
  });

  it('says so when the list has no ticket at all', async () => {
    const { form } = renderInEventForm(<Tickets />);
    await act(async () => {
      form().setValue('tickets', []);
      await form().trigger('tickets');
    });
    expect(screen.getByText('Add at least one ticket type')).toBeInTheDocument();
  });
});
