import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { addDays, format, startOfDay } from 'date-fns';
import RecurringAvailabilityDialog from '../src/recurring/RecurringAvailabilityDialog';
import { CREATE_VENUE_SLOTS, MY_SLOT_TEMPLATES } from '../src/queries';
import type { VenueSpace } from '../src/types';

// Deterministic stand-ins for the MUI X pickers (see DayDrawer.test.tsx).
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (v: Date | null) => void }) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));
vi.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (v: Date | null) => void }) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));

const VENUE_ID = 'venue-1';
// The generator uses the real clock, so the range sits inside the 60-day window.
const DAY = startOfDay(addDays(new Date(), 5));
const NEXT = addDays(DAY, 1);
const local = (d: Date) => format(d, "yyyy-MM-dd'T'00:00:00");

const templatesMock: MockedResponse = {
  request: { query: MY_SLOT_TEMPLATES, variables: { venue_id: VENUE_ID } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { mySlotTemplates: [] } },
};

const createMock = (capture: (v: Record<string, any>) => void, delay = 0): MockedResponse => ({
  request: { query: CREATE_VENUE_SLOTS, variables: () => true },
  delay,
  result: (variables: Record<string, any>) => {
    capture(variables);
    return {
      data: {
        createVenueSlots: [
          { __typename: 'VenueSlot', id: 'created-1', start_at: DAY.toISOString(), end_at: NEXT.toISOString(), price: 399, status: 'AVAILABLE', notes: '' },
        ],
      },
    };
  },
});

const HALL: VenueSpace[] = [{ label: 'Hall', capacity: 50 }];

function renderDialog(mocks: MockedResponse[], capacityItems = HALL) {
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[templatesMock, ...mocks]}>
      <RecurringAvailabilityDialog
        open
        onClose={onClose}
        venueId={VENUE_ID}
        settings={undefined}
        capacityItems={capacityItems}
        venueCapacity={120}
        onDone={onDone}
      />
    </MockedProvider>,
  );
  return { onClose, onDone };
}

const pickRange = (from: Date, to: Date) => {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: local(from) } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: local(to) } });
};

describe('RecurringAvailabilityDialog', () => {
  it('opens on an empty preview and keeps quiet until the dates are picked', () => {
    renderDialog([]);
    expect(screen.getByText('Recurring availability')).toBeInTheDocument();
    expect(screen.getByText('Create slots with custom timing, pricing and venue settings.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create 0 slots' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('counts the slots the range will create, singular when there is one', () => {
    renderDialog([]);
    pickRange(DAY, DAY);
    expect(screen.getByRole('button', { name: 'Create 1 slot' })).toBeEnabled();
    pickRange(DAY, NEXT);
    expect(screen.getByRole('button', { name: 'Create 2 slots' })).toBeEnabled();
  });

  it('explains why nothing can be created once the dates are picked', () => {
    renderDialog([]);
    pickRange(NEXT, DAY);
    expect(screen.getByRole('alert')).toHaveTextContent('End date must be on or after the start date.');
    expect(screen.getByRole('button', { name: 'Create 0 slots' })).toBeDisabled();
  });

  it('sends the batch with the chosen conflict mode, refreshes and closes', async () => {
    let created: Record<string, any> | null = null;
    const { onClose, onDone } = renderDialog([createMock((v) => { created = v; })]);
    pickRange(DAY, DAY);
    fireEvent.click(screen.getByRole('radio', { name: /Overwrite the existing slot/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create 1 slot' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(created!.input).toMatchObject({ venue_id: VENUE_ID, on_conflict: 'REPLACE' });
    expect(created!.input.slots).toHaveLength(1);
  });

  it('keeps the dialog open with the server message when the batch fails, and lets it be dismissed', async () => {
    const { onClose } = renderDialog([
      { request: { query: CREATE_VENUE_SLOTS, variables: () => true }, error: new Error('Server exploded') },
    ]);
    pickRange(DAY, DAY);
    fireEvent.click(screen.getByRole('button', { name: 'Create 1 slot' }));

    const alert = (await screen.findByText('Server exploded')).closest('[role="alert"]') as HTMLElement;
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(within(alert).getByRole('button'));
    expect(screen.queryByText('Server exploded')).not.toBeInTheDocument();
  });

  it('shows the busy label while the batch is in flight', async () => {
    renderDialog([createMock(() => undefined, 60_000)]);
    pickRange(DAY, DAY);
    fireEvent.click(screen.getByRole('button', { name: 'Create 1 slot' }));
    expect(await screen.findByRole('button', { name: 'Creating…' })).toBeDisabled();
  });

  it('closes from Cancel and from the corner button, resetting the form', () => {
    const { onClose } = renderDialog([]);
    pickRange(DAY, DAY);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Start date')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
