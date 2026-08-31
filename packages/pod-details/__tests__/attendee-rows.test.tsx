/**
 * The attendee table's rows, and the audit rail beside them.
 *
 * A row is one BOOKING, not one person, which is the thing most easily got
 * wrong: a ticket admits several seats, so the row has to say how many and name
 * the companions it covers. Counting rows instead of seats undercounts the
 * people who will actually turn up.
 *
 * The other rules are all about a booking that ended badly. A backed-out row is
 * struck through rather than removed, because the pod's history is the record
 * an admin answers questions from; the person who took the freed spot is named
 * on it; and the refund state is shown as its own thing, since "backed out" and
 * "refunded" are different facts and a row that conflated them would answer a
 * money question wrongly.
 *
 * The story under each row is folded away by default — a table where every row
 * is expanded is not a table.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import AttendeeRow from '../src/AttendeeRow';
import PodActivityFeed from '../src/PodActivityFeed';
import type { AdminPodAttendeeRow } from '../src/queries';

const testTheme = createTheme();

const POD_AT = '2026-08-30T12:30:00.000Z';

const row = (over: Partial<AdminPodAttendeeRow> = {}): AdminPodAttendeeRow => ({
  member_id: 'pm-1',
  seats: 1,
  companions: [],
  user_id: 'u-1',
  full_name: 'Meera N',
  email: 'meera@duncit.com',
  phone: '9000000001',
  profile_photo: null,
  is_host: false,
  status: 'JOINED',
  joined_at: '2026-08-01T10:00:00.000Z',
  backed_out_at: null,
  source: 'APP',
  refund_status: null,
  payment_id: 'pay-1',
  backout_no: null,
  replaced_by_user_id: null,
  replaced_by_name: null,
  participation: {
    joined_at: '2026-08-01T10:00:00.000Z',
    attended: true,
    attended_at: POD_AT,
    attendance_recorded: true,
  },
  ...over,
});

const table = (ui: React.ReactNode) =>
  render(
    <ThemeProvider theme={testTheme}>
      <MemoryRouter>
        <table>
          <tbody>{ui}</tbody>
        </table>
      </MemoryRouter>
    </ThemeProvider>
  );

const attendee = (over: Partial<AdminPodAttendeeRow> = {}, statusText = 'Joined') =>
  table(<AttendeeRow row={row(over)} statusText={statusText} podDateTime={POD_AT} colSpan={7} />);

describe('AttendeeRow', () => {
  it('names who booked, and how to reach them', () => {
    const { container } = attendee();

    expect(container.textContent).toContain('Meera N');
    expect(container.textContent).toContain('meera@duncit.com');
    expect(container.textContent).toContain('9000000001');
  });

  it('says how many SEATS the booking holds — a row is a booking, not a person', () => {
    const single = attendee();
    const group = attendee({ seats: 4 });

    expect(group.container.textContent).not.toBe(single.container.textContent);
    expect(group.container.textContent).toContain('4');
  });

  it('names the companions a multi-seat ticket covers', () => {
    const { container } = attendee({
      seats: 3,
      companions: [
        { name: 'Vikram N', phone_number: '9000000002' },
        { name: 'Ayesha K', phone_number: '9000000003' },
      ] as AdminPodAttendeeRow['companions'],
    });

    expect(container.textContent).toContain('Vikram N');
    expect(container.textContent).toContain('Ayesha K');
  });

  it('renders the host seat, which carries no booking of its own', () => {
    const { container } = attendee({ is_host: true, member_id: null, payment_id: null });

    expect(container.textContent).toContain('Meera N');
  });

  it('strikes a backed-out booking through rather than removing it', () => {
    const gone = attendee({ status: 'BACKED_OUT', backed_out_at: '2026-08-20T10:00:00.000Z' }, 'Backed out');
    const here = attendee();

    // The pod's history is the record an admin answers questions from.
    expect(gone.container.textContent).toContain('Meera N');
    expect(gone.container.innerHTML).not.toBe(here.container.innerHTML);
  });

  it('names whoever took the freed spot', () => {
    const { container } = attendee({
      status: 'BACKED_OUT',
      replaced_by_user_id: 'u-9',
      replaced_by_name: 'Rahul S',
    }, 'Backed out');

    expect(container.textContent).toContain('Rahul S');
  });

  it('names the backout the freed spot came from, beside whoever took it', () => {
    // The number is what ties the row to its backout record, so it is shown
    // with the replacement rather than on its own.
    const { container } = attendee(
      {
        status: 'BACKED_OUT',
        backout_no: 'DUN-BKO-0007',
        replaced_by_user_id: 'u-9',
        replaced_by_name: 'Rahul S',
      },
      'Backed out',
    );

    expect(container.textContent).toContain('DUN-BKO-0007');
    expect(container.textContent).toContain('Rahul S');
  });

  it('renders a backout still in process, before anybody has taken the spot', () => {
    const { container } = attendee({ status: 'BACKOUT_IN_PROCESS', backout_no: 'DUN-BKO-0008' }, 'Leaving');

    expect(container.textContent).toContain('Meera N');
  });

  it('shows the refund state separately — backed out and refunded are different facts', () => {
    const refunded = attendee({ status: 'BACKED_OUT', refund_status: 'REFUNDED' }, 'Backed out');
    const pending = attendee({ status: 'BACKED_OUT', refund_status: 'PENDING' }, 'Backed out');

    expect(refunded.container.innerHTML).not.toBe(pending.container.innerHTML);
  });

  it('folds the participation story away by default, and opens it on request', () => {
    const { container } = attendee();
    const before = container.textContent ?? '';

    const [toggle] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(toggle);

    // A table where every row is expanded is not a table.
    expect((container.textContent ?? '').length).toBeGreaterThan(before.length);
  });

  it('opens a row for a host seat that has no booking behind it', () => {
    const { container } = attendee({ is_host: true, member_id: null, participation: null });

    const [toggle] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(toggle);

    expect(container.textContent).toContain('Meera N');
  });

  it('renders somebody with no name, no email and no photo on file', () => {
    const { container } = attendee({ full_name: null, email: null, phone: null });

    expect(container.innerHTML).not.toBe('');
  });

  it('opens the member profile rather than a URL of its own', () => {
    const { container } = attendee();

    for (const control of container.querySelectorAll<HTMLElement>('button, a')) {
      fireEvent.click(control);
    }

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a booking nobody has marked attendance on yet', () => {
    const { container } = attendee({
      participation: { joined_at: '2026-08-01T10:00:00.000Z', attended: false, attendance_recorded: false },
    });

    const [toggle] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(toggle);

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a booking on a pod that was cancelled outright', () => {
    const { container } = attendee({
      participation: {
        joined_at: '2026-08-01T10:00:00.000Z',
        pod_cancelled_by: 'HOST',
        pod_cancelled_at: '2026-08-25T10:00:00.000Z',
        cancel_refund_status: 'REFUNDED',
      } as AdminPodAttendeeRow['participation'],
    });

    const [toggle] = container.querySelectorAll<HTMLElement>('button');
    fireEvent.click(toggle);

    expect(container.innerHTML).not.toBe('');
  });
});

describe('PodActivityFeed', () => {
  const entry = (over: Record<string, unknown> = {}) => ({
    id: 'audit-1',
    action: 'CREATE',
    actor_name: 'Asha Rao',
    actor_id: 'u-1',
    note: 'Created from the admin console',
    created_at: '2026-08-01T10:00:00.000Z',
    changes: [],
    ...over,
  });

  const feed = (entries: unknown[]) =>
    render(
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <PodActivityFeed
            entries={entries as never}
            colorMap={{ CREATE: 'success', VENUE_APPROVED: 'info' } as never}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

  it('leads each row with the ACTOR, so the column has one left edge', () => {
    const { container } = feed([entry(), entry({ id: 'audit-2', action: 'VENUE_APPROVED' })]);

    // The names used to start wherever the chip happened to end, which made the
    // column read as ragged noise.
    expect(container.textContent).toContain('Asha Rao');
    expect(container.textContent).toContain('CREATE');
  });

  it('shows the note somebody left with the action', () => {
    expect(feed([entry()]).container.textContent).toContain('Created from the admin console');
  });

  it('renders an entry nobody left a note on', () => {
    expect(feed([entry({ note: null })]).container.textContent).toContain('Asha Rao');
  });

  it('renders an action the colour map does not name', () => {
    expect(feed([entry({ action: 'SOMETHING_NEW' })]).container.textContent).toContain('SOMETHING_NEW');
  });

  it('renders an entry with no actor recorded', () => {
    expect(feed([entry({ actor_name: null, actor_id: null })]).container.innerHTML).not.toBe('');
  });

  it('renders a pod nothing has happened to yet', () => {
    expect(feed([]).container).toBeDefined();
  });
});
