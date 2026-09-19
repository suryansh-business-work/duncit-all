import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { format } from 'date-fns';
import { formatDateTime } from '@duncit/app-settings';
import EventDrawer from '@/components/calendar/EventDrawer';
import EventPill from '@/components/calendar/EventPill';
import CalendarList from '@/components/calendar/CalendarList';
import type { CalEvent } from '@/components/calendar/useCalendarEvents';
import { renderWithApollo } from '../helpers/renderWithApollo';

const NOW = new Date('2026-09-15T09:00:00.000Z');

const calEvent = (overrides: Partial<CalEvent>): CalEvent => ({
  id: 'r-1',
  date: new Date('2026-09-15T12:00:00.000Z'),
  title: 'Call Grand Hall back',
  kind: 'reminder',
  status: 'PENDING',
  entity: 'VENUE_LEAD',
  leadId: 'venue-1',
  leadName: 'Grand Hall',
  notes: null,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const URGENCY_CASES: Array<[string, Partial<CalEvent>]> = [
  ['Done', { status: 'DONE' }],
  ['Overdue', { date: new Date('2026-09-15T08:00:00.000Z') }],
  ['Due within 24 hours', { date: new Date('2026-09-15T20:00:00.000Z') }],
  ['Upcoming', { date: new Date('2026-09-20T09:00:00.000Z') }],
];

describe('EventPill', () => {
  it.each(URGENCY_CASES)('says "%s" in words, not only in colour', (label, overrides) => {
    const onClick = vi.fn();
    render(<EventPill event={calEvent(overrides)} onClick={onClick} />);

    const pill = screen.getByTestId('crm-calendar-event-pill');
    expect(within(pill).getByText(label)).toBeInTheDocument();
    fireEvent.click(pill);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ title: 'Call Grand Hall back' }));
  });

  it('prefixes the time when asked to', () => {
    const event = calEvent({});
    render(<EventPill event={event} onClick={vi.fn()} showTime />);
    expect(screen.getByTestId('crm-calendar-event-pill')).toHaveTextContent(`${format(event.date, 'p')} Call Grand Hall back`);
  });
});

describe('CalendarList', () => {
  it('groups events under their day, today included', () => {
    const today = new Date('2026-09-15T12:00:00.000Z');
    const later = new Date('2026-09-18T12:00:00.000Z');
    render(
      <CalendarList
        days={[today, new Date('2026-09-16T12:00:00.000Z'), later]}
        events={[calEvent({ id: 'a', date: today }), calEvent({ id: 'b', date: later, title: 'Send the contract' })]}
        onEvent={vi.fn()}
      />,
    );

    expect(screen.getByText(format(today, 'EEE, dd MMM'))).toBeInTheDocument();
    expect(screen.getByText(format(later, 'EEE, dd MMM'))).toBeInTheDocument();
    expect(screen.queryByText(format(new Date('2026-09-16T12:00:00.000Z'), 'EEE, dd MMM'))).toBeNull();
    expect(screen.getAllByTestId('crm-calendar-event-pill')).toHaveLength(2);
  });

  it('says nothing is scheduled, in the caller’s words when given', () => {
    const { rerender } = render(<CalendarList days={[NOW]} events={[]} onEvent={vi.fn()} />);
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();

    rerender(<CalendarList days={[NOW]} events={[]} onEvent={vi.fn()} emptyHint="Nothing scheduled in this range." />);
    expect(screen.getByText('Nothing scheduled in this range.')).toBeInTheDocument();
  });
});

describe('EventDrawer', () => {
  const renderDrawer = (event: CalEvent | null) => {
    const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onToggleDone: vi.fn(), onDelete: vi.fn() };
    renderWithApollo(<EventDrawer event={event} {...handlers} />, [], { route: '/reminders' });
    return handlers;
  };

  it('shows a pending lead reminder and jumps to its venue lead', () => {
    const event = calEvent({ notes: 'Bring the rate card' });
    const { onClose, onEdit, onToggleDone, onDelete } = renderDrawer(event);

    const drawer = within(screen.getByRole('dialog', { name: 'Call Grand Hall back' }));
    expect(drawer.getByText('Reminder')).toBeInTheDocument();
    expect(drawer.getByText(formatDateTime(event.date))).toBeInTheDocument();
    expect(drawer.getByText('Venue lead')).toBeInTheDocument();
    expect(drawer.getByText('Pending')).toBeInTheDocument();
    expect(drawer.getByText('Grand Hall')).toBeInTheDocument();
    expect(drawer.getByText('Bring the rate card')).toBeInTheDocument();

    fireEvent.click(drawer.getByRole('button', { name: 'Mark done' }));
    fireEvent.click(drawer.getByRole('button', { name: 'Edit' }));
    fireEvent.click(drawer.getByRole('button', { name: 'Delete' }));
    expect(onToggleDone).toHaveBeenCalledWith(event);
    expect(onEdit).toHaveBeenCalledWith(event);
    expect(onDelete).toHaveBeenCalledWith(event);

    fireEvent.click(drawer.getByRole('button', { name: 'Open venue lead' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/venue-leads/venue-1/view');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a host follow-up read-only, with a jump to the host lead', () => {
    const { onClose } = renderDrawer(
      calEvent({ id: 'f-HOST_LEAD-host-1', kind: 'followup', status: undefined, entity: 'HOST_LEAD', leadId: 'host-1', leadName: 'Pune Runners', title: 'Follow-up · Pune Runners' }),
    );

    expect(screen.getByText('Follow-up')).toBeInTheDocument();
    expect(screen.getByText('Host lead')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark done' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open host lead' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/host-leads/host-1/view');
    expect(onClose).toHaveBeenCalled();
  });

  it('describes a done general reminder that belongs to no lead', () => {
    renderDrawer(calEvent({ status: 'DONE', entity: 'GENERAL', leadId: null, leadName: null }));

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('General reminder (not linked to a lead)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark pending' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open .* lead/ })).toBeNull();
  });

  it('shows a dash for a lead reminder whose lead is unknown, and closes', () => {
    const { onClose } = renderDrawer(calEvent({ leadId: null, leadName: null }));

    expect(screen.getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while no event is selected', () => {
    renderDrawer(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
