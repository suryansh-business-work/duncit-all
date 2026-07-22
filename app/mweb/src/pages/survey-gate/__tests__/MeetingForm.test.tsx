import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import MeetingForm from '../MeetingForm';
import { MEETING_SLOTS } from '../queries';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mirror the inline query defined inside MeetingForm so the mock matches.
const MEETING_ME = gql`
  query MeetingMe {
    me {
      user_id
      full_name
      phone_number
      phone_extension
    }
  }
`;

// The component renders slot times via toLocaleTimeString with the same options,
// so computing it here yields the exact chip label at test runtime.
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

const SLOT_A = '2026-08-01T10:00:00.000Z';
const SLOT_B = '2026-08-01T11:00:00.000Z';

const slotsMock = (slots: unknown[] | null, error = false) => ({
  request: { query: MEETING_SLOTS, variables: { kind: 'VENUE' } },
  ...(error
    ? { error: new Error('slots blew up') }
    : { result: { data: { meetingSlots: slots } } }),
});

const meMock = (me: Record<string, unknown> | null) => ({
  request: { query: MEETING_ME },
  result: { data: { me } },
});

const populatedSlots = [
  { start_at: SLOT_A, end_at: SLOT_B, available: true },
  { start_at: SLOT_B, end_at: '2026-08-01T12:00:00.000Z', available: false },
];

const renderForm = (mocks: unknown[], props: Partial<React.ComponentProps<typeof MeetingForm>> = {}) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <MemoryRouter>
        <MeetingForm kind="VENUE" submitting={false} onSubmit={vi.fn()} {...props} />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('MeetingForm', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('shows a spinner while slots are loading', () => {
    renderForm([slotsMock(populatedSlots), meMock(null)]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the query error alert', async () => {
    renderForm([slotsMock(null, true), meMock(null)]);
    expect(await screen.findByText('slots blew up')).toBeInTheDocument();
  });

  it('shows the empty-state info alert when no slots are open', async () => {
    renderForm([slotsMock([]), meMock(null)]);
    expect(await screen.findByText(/No slots are open right now/)).toBeInTheDocument();
  });

  it('prefills the name read-only from profile and shows phone read-only', async () => {
    renderForm([
      slotsMock(populatedSlots),
      meMock({ user_id: 'U1', full_name: 'Asha Rao', phone_number: '9999999999', phone_extension: '01' }),
    ]);
    const nameInput = (await screen.findByLabelText('Your name')) as HTMLInputElement;
    await waitFor(() => expect(nameInput.value).toBe('Asha Rao'));
    expect(nameInput).toBeDisabled();
    // Both the name and phone fields carry a "From your profile." helper.
    expect(screen.getAllByText('From your profile.')).toHaveLength(2);
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('9999999999');
    expect((screen.getByLabelText('Ext.') as HTMLInputElement).value).toBe('01');
  });

  it('validates that a slot must be picked before submitting', async () => {
    const onSubmit = vi.fn();
    renderForm(
      [slotsMock(populatedSlots), meMock({ user_id: 'U1', full_name: 'A', phone_number: '5551112222', phone_extension: '' })],
      { onSubmit },
    );
    await screen.findByLabelText('Your name');
    fireEvent.click(screen.getByRole('button', { name: 'Book this slot' }));
    expect(await screen.findByText('Pick an available slot.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a normalized payload once a slot is selected', async () => {
    const onSubmit = vi.fn();
    renderForm(
      [slotsMock(populatedSlots), meMock({ user_id: 'U1', full_name: 'A', phone_number: '5551112222', phone_extension: '01' })],
      { onSubmit },
    );
    await screen.findByLabelText('Your name');

    // Pick the available slot chip, then add a note.
    fireEvent.click(screen.getByText(timeLabel(SLOT_A)));
    fireEvent.change(screen.getByLabelText(/Anything we should know/), { target: { value: 'call me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Book this slot' }));

    expect(onSubmit).toHaveBeenCalledWith({
      requested_at: SLOT_A,
      notes: 'call me',
      contact_name: 'A',
      contact_phone: '01 5551112222',
    });
  });

  it('blocks submission and shows the profile CTA when phone is missing', async () => {
    const onSubmit = vi.fn();
    renderForm(
      [slotsMock(populatedSlots), meMock({ user_id: 'U1', full_name: 'A', phone_number: '', phone_extension: '' })],
      { onSubmit },
    );
    await screen.findByText(/Phone number is required/);

    fireEvent.click(screen.getByText(timeLabel(SLOT_A)));
    fireEvent.click(screen.getByRole('button', { name: 'Book this slot' }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Go To Profile' }));
    expect(mockNavigate).toHaveBeenCalledWith('/account');
  });

  it('lets the user type a name when the profile has none', async () => {
    renderForm([
      slotsMock(populatedSlots),
      meMock({ user_id: 'U1', full_name: null, phone_number: '5551112222', phone_extension: '' }),
    ]);
    const nameInput = (await screen.findByLabelText('Your name')) as HTMLInputElement;
    expect(nameInput).not.toBeDisabled();
    fireEvent.change(nameInput, { target: { value: 'Typed Name' } });
    expect(nameInput.value).toBe('Typed Name');
  });

  it('renders the submit error passed from the parent', async () => {
    renderForm([slotsMock(populatedSlots), meMock(null)], { error: 'Server said no' });
    expect(await screen.findByText('Server said no')).toBeInTheDocument();
  });

  it('shows the booking label while submitting', async () => {
    renderForm([slotsMock(populatedSlots), meMock(null)], { submitting: true });
    const btn = await screen.findByRole('button', { name: 'Booking…' });
    expect(btn).toBeDisabled();
  });
});
