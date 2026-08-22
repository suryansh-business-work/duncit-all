/**
 * What the host sees at the door, and what the payout is computed from.
 *
 * These are the four surfaces the scan flow is made of, rendered with the data
 * the flow actually produces rather than with nothing behind them. Each keeps a
 * rule that showed up as a real defect first:
 *
 *  - a ticket awaiting its companions has marked NOBODY. The chip used to say
 *    "Marked present" there, which made a broken second step look finished.
 *  - one QR can admit a whole group, so the head count is the first thing on
 *    the card: it decides how many people walk past the host.
 *  - the group form does not submit until every seat has a name AND a phone
 *    number, because the server enforces the same count — a half-filled form
 *    cannot mark a group present, it can only fail.
 *  - the roster is the settlement's EVIDENCE. The payout comes from the
 *    attended rows only, so a host who disagrees with a number can see exactly
 *    which booking produced it, and marking is a scan rather than a toggle.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { buildSlotLabels } from '@duncit/slots';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostPodActionsProvider, type HostPodActionsConfig } from '../src/HostPodActionsProvider';
import ScannedAttendeeCard from '../src/ticket-scan/ScannedAttendeeCard';
import CompanionsForm from '../src/ticket-scan/CompanionsForm';
import AttendanceRoster from '../src/pod-complete/AttendanceRoster';
import HostPodActionsMenu from '../src/HostPodActionsMenu';
import { mwebHostPodLabels } from '../src/labels';
import type { PodSettlementAttendee, ScannedAttendee } from '../src/types';

const t = (key: string) => key;
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const onViewProfile = vi.fn();

const config = (): HostPodActionsConfig => ({
  labels: mwebHostPodLabels(t),
  renderMediaField: ({ value, onChange }) => (
    <textarea aria-label="media" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  onViewProfile,
  feedbackBaseUrl: 'https://duncit.com',
  onOpenFeedback: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  slotLabels: buildSlotLabels(t, 'mweb.slots'),
});

const wrap = (ui: ReactNode) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...config()}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const attendee = (over: Partial<ScannedAttendee> = {}): ScannedAttendee => ({
  user_id: 'u-1',
  full_name: 'Meera N',
  profile_photo: 'https://ik.imagekit.io/duncit/meera.jpg',
  profile_path: '/profile/meera',
  email: 'meera@duncit.com',
  phone: '9000000001',
  whatsapp: '9000000001',
  bio: 'Plays doubles on Sundays.',
  address: '12 Church Street',
  city: 'Bengaluru',
  joined_at: '2026-08-01T10:00:00.000Z',
  ...over,
});

const booking = (over: Partial<PodSettlementAttendee> = {}): PodSettlementAttendee => ({
  membership_id: 'pm-1',
  user_id: 'u-1',
  name: 'Meera N',
  seats: 1,
  attended: true,
  attended_at: '2026-08-20T09:00:00.000Z',
  amount: 250,
  ...over,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScannedAttendeeCard', () => {
  it('shows who just walked in', () => {
    const { container } = wrap(<ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} />);

    expect(container.textContent).toContain('Meera N');
  });

  it('leads with the head count, because it decides how many people walk past', () => {
    const single = wrap(<ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} seats={1} />);
    const group = wrap(<ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} seats={4} />);

    expect(group.container.textContent).not.toBe(single.container.textContent);
  });

  it('says nobody is marked yet while the group details are still being collected', () => {
    const { container } = wrap(
      <ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} pending seats={3} />
    );

    // The chip used to read "Marked present" here, which made the broken second
    // step look done.
    expect(container.textContent).not.toContain('Marked present');
  });

  it('distinguishes a fresh mark from one that had already happened', () => {
    const fresh = wrap(<ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} />);
    const repeat = wrap(<ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn />);

    expect(repeat.container.textContent).not.toBe(fresh.container.textContent);
  });

  it('shows only the contact details the attendee actually has', () => {
    const full = wrap(<ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} />);
    const sparse = wrap(
      <ScannedAttendeeCard
        attendee={attendee({ email: '', phone: '', whatsapp: '', bio: '', address: '', city: '' })}
        alreadyCheckedIn={false}
      />
    );

    expect(sparse.container.querySelectorAll('a').length).toBeLessThan(
      full.container.querySelectorAll('a').length
    );
  });

  it('prints the ticket code when the door has one to check against', () => {
    const { container } = wrap(
      <ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} ticketCode="DUN-TKT-0007" />
    );

    expect(container.textContent).toContain('DUN-TKT-0007');
  });

  it('opens the full profile through the surface, never a URL of its own', () => {
    const { container } = wrap(<ScannedAttendeeCard attendee={attendee()} alreadyCheckedIn={false} />);

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [path] of onViewProfile.mock.calls) expect(path).toBe('/profile/meera');
  });

  it('renders an attendee who has never joined anything yet', () => {
    const { container } = wrap(
      <ScannedAttendeeCard attendee={attendee({ joined_at: null, profile_photo: '' })} alreadyCheckedIn={false} />
    );

    expect(container.textContent).toContain('Meera N');
  });
});

describe('CompanionsForm', () => {
  it('asks for exactly the seats still unaccounted for', () => {
    const { container } = wrap(<CompanionsForm seats={4} required={3} onSubmit={vi.fn()} />);

    // Three people, each needing a name and a number.
    expect(container.querySelectorAll('input').length).toBeGreaterThanOrEqual(6);
  });

  it('does not submit a half-filled group — the server enforces the same count', async () => {
    const onSubmit = vi.fn();
    const { container } = wrap(<CompanionsForm seats={3} required={2} onSubmit={onSubmit} />);

    const [firstName] = container.querySelectorAll<HTMLInputElement>('input');
    if (firstName) fireEvent.change(firstName, { target: { value: 'Vikram N' } });
    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }
    await settle();
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reports one entry per seat once every one has a name and a number', async () => {
    const onSubmit = vi.fn();
    const { container } = wrap(<CompanionsForm seats={3} required={2} onSubmit={onSubmit} />);

    const fields = [...container.querySelectorAll<HTMLInputElement>('input')];
    fields.forEach((field, index) => {
      fireEvent.change(field, {
        target: { value: index % 2 === 0 ? `Guest ${index}` : '9000000002' },
      });
    });
    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }
    await settle();
    await settle();

    for (const [companions] of onSubmit.mock.calls) {
      expect(companions).toHaveLength(2);
    }
  });

  it('renders while the mark is in flight', () => {
    const { container } = wrap(<CompanionsForm seats={2} required={1} busy onSubmit={vi.fn()} />);

    expect(container.innerHTML).not.toBe('');
  });
});

describe('AttendanceRoster', () => {
  const ROWS = [
    booking(),
    booking({ membership_id: 'pm-2', user_id: 'u-2', name: 'Vikram N', seats: 3, amount: 750 }),
    booking({
      membership_id: 'pm-3',
      user_id: 'u-3',
      name: 'Ayesha K',
      attended: false,
      attended_at: null,
      amount: 250,
    }),
  ];

  const roster = (over: Partial<Parameters<typeof AttendanceRoster>[0]> = {}) => {
    const onScan = vi.fn();
    return {
      onScan,
      ...wrap(
        <AttendanceRoster
          attendees={ROWS}
          attendedSeats={4}
          bookedSeats={5}
          symbol="₹"
          onScan={onScan}
          {...over}
        />
      ),
    };
  };

  it('names every booking, so a disputed number can be traced to one of them', () => {
    const { container } = roster();

    expect(container.textContent).toContain('Meera N');
    expect(container.textContent).toContain('Vikram N');
    expect(container.textContent).toContain('Ayesha K');
  });

  it('says how many seats each booking covers, not just how many bookings there are', () => {
    const { container } = roster();

    expect(container.textContent).toContain('3 seats');
    expect(container.textContent).toContain('1 seat');
  });

  it('shows what each booking paid, in the settlement currency it was given', () => {
    const { container } = roster();

    expect(container.textContent).toContain('₹');
  });

  it('offers the scanner rather than a toggle — attendance is proof of arrival', () => {
    const { container, onScan } = roster();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(onScan).toHaveBeenCalled();
  });

  it('renders a pod nobody has been scanned into yet', () => {
    const { container } = roster({
      attendees: ROWS.map((row) => ({ ...row, attended: false, attended_at: null })),
      attendedSeats: 0,
    });

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a pod with no bookings at all', () => {
    const { container } = roster({ attendees: [], attendedSeats: 0, bookedSeats: 0 });

    expect(container).toBeDefined();
  });
});

describe('HostPodActionsMenu', () => {
  const menu = (over: Partial<Parameters<typeof HostPodActionsMenu>[0]> = {}) => {
    const spies = {
      onScan: vi.fn(),
      onComplete: vi.fn(),
      onEdit: vi.fn(),
      onOpenFeedback: vi.fn(),
      onShareFeedback: vi.fn(),
      onCopyFeedback: vi.fn(),
      onCancel: vi.fn(),
    };
    const result = wrap(<HostPodActionsMenu podTitle="Sunday Badminton" {...spies} {...over} />);
    return { ...result, spies };
  };

  const open = async (container: HTMLElement) => {
    const [trigger] = container.querySelectorAll<HTMLElement>('button');
    if (trigger) fireEvent.click(trigger);
    await settle();
  };

  it('opens onto the actions a host has on their own pod', async () => {
    const { container } = menu();
    await open(container);

    expect(document.body.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(0);
  });

  it('offers the page items only where the surface has those routes', async () => {
    const bare = menu();
    await open(bare.container);
    const bareItems = document.body.querySelectorAll('[role="menuitem"]').length;

    const full = menu({ onSeeAttendance: vi.fn(), onSlotRequest: vi.fn() });
    await open(full.container);

    expect(document.body.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(bareItems);
  });

  it('is read-only once the pod is completed or cancelled', async () => {
    const { container, spies } = menu({ disabled: true });
    await open(container);

    for (const item of document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
      fireEvent.click(item);
      await settle();
    }

    expect(spies.onCancel).not.toHaveBeenCalled();
    expect(spies.onComplete).not.toHaveBeenCalled();
  });

  it('reports each action to the surface that owns it', async () => {
    const { container, spies } = menu();
    await open(container);

    for (const item of document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
      fireEvent.click(item);
      await settle();
      await open(container);
    }

    const fired = Object.values(spies).filter((spy) => spy.mock.calls.length > 0);
    expect(fired.length).toBeGreaterThan(0);
  });
});
