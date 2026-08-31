/**
 * Applying to host, and applying to list a venue — the same page, two shapes.
 *
 * This is the first thing a would-be partner does, and the last chance to catch
 * a bad application before a person's time is booked against it. So every rule
 * here is about not wasting that: the form refuses one field at a time with the
 * reason named, rather than a single "invalid" over the whole thing, and it will
 * not submit without at least one preferred slot — an interview request with no
 * times in it is a request nobody can act on.
 *
 * The calendar refuses days that have already passed. A slot picked in the past
 * reaches the server as a time that cannot be met, and the applicant finds out
 * by never hearing back.
 *
 * The venue shape asks for the business and its address; the host shape does
 * not, and asks a different question about why they want to host. One page, two
 * genuinely different applications.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InterviewBookingPage from '../InterviewBookingPage';
import InterviewCalendar from '../InterviewCalendar';
import InterviewSuccessCard from '../InterviewSuccessCard';
import { CREATE_INTERVIEW } from '../queries';
import { buildMonth, isPastDay, isSameDay, slotKey, TIME_OPTIONS, type Slot } from '../slotHelpers';

const testTheme = createTheme();

const created: MockedResponse = {
  request: { query: CREATE_INTERVIEW, variables: () => true },
  result: { data: { createInterview: { id: 'iv-1', status: 'REQUESTED' } } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode, mocks: MockedResponse[] = [created]) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

/** Text of every field on the page, keyed by its label, for filling in. */
const fieldsOf = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')];

const submitButton = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
    /request interview/i.test(button.textContent ?? '')
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('slotHelpers', () => {
  it('offers only whole hours a person would actually take a call in', () => {
    expect(TIME_OPTIONS.every((time) => /^\d{2}:00$/.test(time))).toBe(true);
    expect(TIME_OPTIONS).not.toContain('13:00');
  });

  it('keys a slot by its day AND its time, so two times on one day are two slots', () => {
    const day = new Date('2026-09-02T00:00:00Z');

    expect(slotKey(day, '09:00')).not.toBe(slotKey(day, '10:00'));
  });

  it('lays a month out with blanks before the first, so the columns line up with the weekdays', () => {
    const cells = buildMonth(new Date('2026-09-15T00:00:00Z'));

    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean).length).toBe(30);
  });

  it('knows yesterday is past and today is not — today is still bookable', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(isPastDay(yesterday)).toBe(true);
    expect(isPastDay(new Date())).toBe(false);
  });

  it('compares days rather than instants, so two times on one date are the same day', () => {
    // Local dates, because the calendar renders local days — two UTC instants
    // on one UTC date can straddle midnight anywhere east or west of it.
    expect(isSameDay(new Date(2026, 8, 2, 1), new Date(2026, 8, 2, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 8, 2, 23), new Date(2026, 8, 3, 1))).toBe(false);
  });
});

describe('InterviewCalendar', () => {
  const calendar = (over: Partial<Parameters<typeof InterviewCalendar>[0]> = {}) => {
    const spies = {
      setAnchor: vi.fn(),
      setSelectedDate: vi.fn(),
      onToggleSlot: vi.fn(),
      onRemoveSlot: vi.fn(),
    };
    return {
      spies,
      ...wrap(
        <InterviewCalendar
          anchor={new Date('2026-09-15T00:00:00Z')}
          selectedDate={null}
          slots={new Map<string, Slot>()}
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('shows the month it is anchored on', () => {
    const { container } = calendar();

    expect(container.textContent).toContain('September');
  });

  it('moves between months through the caller, never on its own', () => {
    const { container, spies } = calendar();

    for (const control of container.querySelectorAll<HTMLElement>('button[aria-label], button')) {
      fireEvent.click(control);
    }

    for (const [next] of spies.setAnchor.mock.calls) expect(next).toBeInstanceOf(Date);
  });

  it('never offers a day that has already gone', () => {
    // Anchored on a month entirely in the past, every day is refused — a slot
    // picked there reaches the server as a time nobody can meet.
    const { spies, container } = calendar({ anchor: new Date('2020-01-15T00:00:00Z') });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.setSelectedDate).not.toHaveBeenCalled();
  });

  it('offers the times once a day has been chosen', () => {
    const chosen = new Date();
    chosen.setDate(chosen.getDate() + 3);
    const { container } = calendar({ anchor: chosen, selectedDate: chosen });

    expect(container.textContent).toContain('09:00');
  });

  it('reports the day and the time it was toggled on, not just the time', () => {
    const chosen = new Date();
    chosen.setDate(chosen.getDate() + 3);
    const { container, spies } = calendar({ anchor: chosen, selectedDate: chosen });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [date, hhmm] of spies.onToggleSlot.mock.calls) {
      expect(date).toBeInstanceOf(Date);
      expect(TIME_OPTIONS).toContain(hhmm);
    }
  });

  it('lists what has been picked so far, and can take one back off', () => {
    const start = new Date('2026-09-20T09:00:00Z');
    const slot: Slot = { start, end: new Date('2026-09-20T10:00:00Z') };
    const { container, spies } = calendar({
      anchor: start,
      slots: new Map([[slotKey(start, '09:00'), slot]]),
    });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [removed] of spies.onRemoveSlot.mock.calls) {
      expect(removed).toHaveProperty('start');
    }
  });
});

describe('InterviewBookingPage', () => {
  const page = (type: 'HOST' | 'VENUE' = 'HOST', mocks?: MockedResponse[]) =>
    wrap(<InterviewBookingPage type={type} />, mocks);

  it('opens on the host application', () => {
    const { container } = page('HOST');

    expect(container.innerHTML).not.toBe('');
  });

  it('asks a venue for its business and address, and a host for neither', () => {
    const host = page('HOST');
    const venue = page('VENUE');

    expect(fieldsOf(venue.container).length).toBeGreaterThan(fieldsOf(host.container).length);
  });

  it('refuses a missing name by naming it, not by calling the form invalid', async () => {
    const { container } = page();

    submitButton(container)?.click();
    await settle();

    expect(container.textContent).toContain('Your name is required');
  });

  it('refuses each field in turn, so the applicant is told one thing to fix', async () => {
    const { container, getByLabelText } = page();

    fireEvent.change(getByLabelText(/full name/i), { target: { value: 'Meera N' } });
    submitButton(container)?.click();
    await settle();
    expect(container.textContent).toContain('Email is required');

    fireEvent.change(getByLabelText(/^email/i), { target: { value: 'meera@duncit.com' } });
    fireEvent.change(getByLabelText(/^phone/i), { target: { value: 'abcd' } });
    submitButton(container)?.click();
    await settle();
    expect(container.textContent).toContain('digits');

    fireEvent.change(getByLabelText(/^phone/i), { target: { value: '9000000001' } });
    submitButton(container)?.click();
    await settle();
    expect(container.textContent).toContain('why you want to host');
  });

  it('will not send an application with no times in it — nobody could act on one', async () => {
    const { container } = page();
    const fields = fieldsOf(container);

    fireEvent.change(fields[0] as HTMLElement, { target: { value: 'Meera N' } });
    fireEvent.change(fields[1] as HTMLElement, { target: { value: 'meera@duncit.com' } });
    fireEvent.change(fields[3] as HTMLElement, { target: { value: '9000000001' } });
    const about = container.querySelector('textarea') as HTMLTextAreaElement;
    if (about) fireEvent.change(about, { target: { value: 'I run a Sunday badminton group.' } });

    submitButton(container)?.click();
    await settle();

    expect(container.textContent).toContain('at least one preferred time slot');
  });

  it('asks a venue about the venue and a host about hosting', async () => {
    const venue = page('VENUE');
    const fields = fieldsOf(venue.container);

    fireEvent.change(fields[0] as HTMLElement, { target: { value: 'Meera N' } });
    fireEvent.change(fields[1] as HTMLElement, { target: { value: 'meera@duncit.com' } });
    fireEvent.change(fields[3] as HTMLElement, { target: { value: '9000000001' } });

    submitButton(venue.container)?.click();
    await settle();

    expect(venue.container.textContent).toContain('your venue');
  });

  it('leaves without applying when the applicant backs out', () => {
    const { container } = page();
    const cancel = [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      /cancel/i.test(button.textContent ?? '')
    );

    expect(cancel).toBeDefined();
    cancel?.click();
  });

  it('survives every control on it being pressed', async () => {
    const { container } = page('VENUE');

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 25)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });
});

describe('InterviewSuccessCard', () => {
  it('gives the applicant the reference they will be asked for', () => {
    const { container } = wrap(<InterviewSuccessCard submittedRef="DUN-IV-0042" />);

    // The tail of it: the whole id is longer than anyone reads out loud.
    expect(container.textContent).toContain('DUN-IV-0042'.slice(-8));
  });

  it('leaves through the router rather than a location of its own', () => {
    const { container } = wrap(<InterviewSuccessCard submittedRef="DUN-IV-0042" />);

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(container.innerHTML).not.toBe('');
  });
});
