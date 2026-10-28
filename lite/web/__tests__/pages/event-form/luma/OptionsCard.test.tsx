import { useState } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { editorFor, OptionsCard, type OptionsEditor } from '../../../../pages/event-form/luma/OptionsCard';
import type { EventFormValues } from '../../../../pages/event-form/event.types';
import { emptyTicket } from '../../../../pages/event-form/event.types';
import { renderInEventForm } from '../helpers';

const CATEGORIES = [{ value: 'cat-1', label: 'Music' }];
const CITIES = [{ value: 'delhi', label: 'Delhi' }];

describe('editorFor', () => {
  const error = { type: 'custom', message: 'wrong' };

  it('opens tickets for a ticket or payment problem', () => {
    expect(editorFor({ tickets: error })).toBe('tickets');
    expect(editorFor({ upi_id: error })).toBe('tickets');
    expect(editorFor({ upi_name: error })).toBe('tickets');
  });

  it('opens capacity, then questions, in that order of priority', () => {
    expect(editorFor({ capacity: error, questions: error })).toBe('capacity');
    expect(editorFor({ questions: error })).toBe('questions');
    expect(editorFor({ upi_id: error, capacity: error })).toBe('tickets');
  });

  it('opens nothing when the problem is on the page itself', () => {
    expect(editorFor({ title: error, end_at: error })).toBeNull();
    expect(editorFor({})).toBeNull();
  });
});

function Card() {
  const [editor, setEditor] = useState<OptionsEditor>(null);
  return <OptionsCard categories={CATEGORIES} cities={CITIES} editor={editor} setEditor={setEditor} />;
}

const ticket = (over: Partial<EventFormValues['tickets'][number]>) => ({ ...emptyTicket('General'), ...over });

describe('OptionsCard', () => {
  it('summarises a fresh form: free, unlimited, no questions', () => {
    renderInEventForm(<Card />);
    expect(screen.getByRole('heading', { name: 'Event options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Free, edit tickets and payments' })).toHaveTextContent('Free');
    expect(screen.getByRole('button', { name: 'Unlimited, edit capacity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0 questions, edit registration questions' })).toBeInTheDocument();
  });

  it('shows the cheapest active ticket, “From” when there are several', () => {
    renderInEventForm(<Card />, { defaults: { tickets: [ticket({ price: '400' }), ticket({ price: '250' }), ticket({ price: '100', is_active: false })], upi_id: 'asha@okbank' } });
    expect(screen.getByRole('button', { name: 'From ₹250, edit tickets and payments' })).toBeInTheDocument();
  });

  it('shows one paid ticket’s price, a set capacity and the question count', () => {
    renderInEventForm(<Card />, {
      defaults: { tickets: [ticket({ price: '1200' })], upi_id: 'asha@okbank', capacity: '40', questions: [{ id: '', label: 'Size', type: 'TEXT', required: false, options: '' }] },
    });
    expect(screen.getByRole('button', { name: '₹1,200, edit tickets and payments' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '40, edit capacity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 question, edit registration questions' })).toBeInTheDocument();
  });

  it('switches approval on and off in the form', async () => {
    const { user, form } = renderInEventForm(<Card />);
    const approval = screen.getByRole('switch', { name: 'Approve each guest before their seat is held' });
    expect(approval).not.toBeChecked();
    await user.click(approval);
    expect(approval).toBeChecked();
    expect(form().getValues('require_approval')).toBe(true);
  });

  it('opens the capacity editor, keeps it open while the number is wrong, and closes on a valid one', async () => {
    const { user, form } = renderInEventForm(<Card />);
    await user.click(screen.getByRole('button', { name: 'Unlimited, edit capacity' }));
    const dialog = screen.getByRole('dialog', { name: 'Capacity' });
    const box = within(dialog).getByRole('textbox', { name: 'Capacity' });

    await user.type(box, '-3');
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(await within(dialog).findByText('This cannot be negative')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Capacity' })).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, '30');
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Capacity' })).not.toBeInTheDocument());
    expect(form().getValues('capacity')).toBe('30');
    expect(screen.getByRole('button', { name: '30, edit capacity' })).toBeInTheDocument();
  });

  it('opens the tickets editor with the payment details beside the tickets', async () => {
    const { user } = renderInEventForm(<Card />);
    await user.click(screen.getByRole('button', { name: 'Free, edit tickets and payments' }));
    const dialog = screen.getByRole('dialog', { name: 'Tickets' });
    expect(within(dialog).getByRole('textbox', { name: 'Ticket name' })).toHaveValue('General admission');
    expect(within(dialog).getByRole('textbox', { name: 'UPI ID' })).toBeInTheDocument();
  });

  it('opens the questions editor', async () => {
    const { user } = renderInEventForm(<Card />);
    await user.click(screen.getByRole('button', { name: '0 questions, edit registration questions' }));
    const dialog = screen.getByRole('dialog', { name: 'Registration questions' });
    expect(within(dialog).getByText('No questions yet.')).toBeInTheDocument();
  });

  it('files the event under a category and a city', async () => {
    const { user, form } = renderInEventForm(<Card />);
    await user.click(screen.getByTestId('event-category'));
    expect(screen.getByRole('option', { name: 'No category' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Music' }));
    expect(form().getValues('category_id')).toBe('cat-1');

    await user.click(screen.getByTestId('event-city'));
    await user.click(screen.getByRole('option', { name: 'Delhi' }));
    expect(form().getValues('city_slug')).toBe('delhi');
  });
});
