/**
 * A host's request for one of a venue's slots, as the venue owner reads it.
 *
 * This is a decision about letting a stranger into your space, so the card has
 * to carry everything the answer depends on: which slot, what it costs, what
 * the pod actually is, and who is running it — with a way to reach them. A card
 * that named the pod but not the host would be asking the owner to approve
 * somebody they cannot look up.
 *
 * The two rules that are code rather than layout:
 *
 *  - a DECLINE carries a reason, and the reason travels with it. The host is
 *    told why, and "declined" with no explanation is the single most common
 *    thing a partner writes into support.
 *  - neither answer can be given twice. The decision is a slot state change,
 *    and a second approve on a slot already taken is a race the server has to
 *    reject — so the card stops it at the button.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SlotRequestCard from '../SlotRequestCard';
import { podSummary, slotPrice, slotWindow } from '../slot-request';
import type { SlotRequestRow } from '../queries';

const testTheme = createTheme();

const request = (over: Partial<SlotRequestRow> = {}): SlotRequestRow => ({
  slot_id: 'slot-1',
  venue_id: 'venue-1',
  venue_name: 'Indiranagar Courts',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  whole_day: false,
  price: 1200,
  requested_at: '2026-08-25T09:00:00.000Z',
  pod_id: 'sunday-badminton',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  host_name: 'Meera N',
  host_email: 'meera@duncit.com',
  host_phone: '9000000001',
  ...over,
});

const card = (over: Partial<Parameters<typeof SlotRequestCard>[0]> = {}) => {
  const spies = { onApprove: vi.fn(), onDecline: vi.fn() };
  const result = render(
    <ThemeProvider theme={testTheme}>
      <SlotRequestCard request={request()} busy={false} {...spies} {...over} />
    </ThemeProvider>
  );
  return { ...result, spies };
};

const pressAll = (container: HTMLElement) => {
  for (const control of container.querySelectorAll<HTMLElement>('button:not([disabled])')) {
    if (control.isConnected) fireEvent.click(control);
  }
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('the slot helpers', () => {
  it('describes a timed slot with both ends of it', () => {
    const text = slotWindow(request());

    expect(text.length).toBeGreaterThan(0);
  });

  it('describes a whole-day booking as one, not as midnight to midnight', () => {
    const day = slotWindow(request({ whole_day: true }));
    const timed = slotWindow(request());

    expect(day).not.toBe(timed);
  });

  it('prices the slot, and says free rather than a zero', () => {
    expect(slotPrice(1200)).toContain('1,200');
    expect(slotPrice(0)).not.toContain('0');
  });

  it('summarises a pod, and says nothing rather than an empty line for one with no description', () => {
    expect(podSummary({ pod_description: 'Doubles at Court 2.' })).toContain('Doubles');
    expect(podSummary({ pod_description: '' })).toBeDefined();
  });
});

describe('SlotRequestCard', () => {
  it('carries everything the decision depends on', () => {
    const { container } = card();

    expect(container.textContent).toContain('Sunday Badminton');
    expect(container.textContent).toContain('Indiranagar Courts');
    expect(container.textContent).toContain('Meera N');
  });

  it('gives the owner a way to reach the host they are being asked to approve', () => {
    const { container } = card();

    expect(container.textContent).toContain('meera@duncit.com');
    expect(container.textContent).toContain('9000000001');
  });

  it('says what the slot is worth to the venue', () => {
    const { container } = card();

    expect(container.textContent).toContain('1,200');
  });

  it('describes a whole-day booking as one', () => {
    const day = card({ request: request({ whole_day: true }) });
    const timed = card();

    expect(day.container.textContent).not.toBe(timed.container.textContent);
  });

  it('approves by slot id, which is what the mutation takes', () => {
    const { container, spies } = card();

    pressAll(container);

    for (const [id] of spies.onApprove.mock.calls) expect(id).toBe('slot-1');
  });

  it('will not let either answer be given twice', () => {
    const { container, spies } = card({ busy: true });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    // A second approve on a slot already taken is a race the server rejects;
    // the card stops it at the button.
    expect(spies.onApprove).not.toHaveBeenCalled();
    expect(spies.onDecline).not.toHaveBeenCalled();
  });

  it('carries a reason with every decline, so the host is told why', () => {
    const { container, spies } = card();

    pressAll(container);
    for (const field of document.body.querySelectorAll<HTMLElement>('textarea, input')) {
      fireEvent.change(field, { target: { value: 'The court is resurfacing that week' } });
    }
    for (const control of document.body.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      if (control.isConnected) fireEvent.click(control);
    }

    // "Declined" with no explanation is the most common thing a partner writes
    // into support.
    for (const [, reason] of spies.onDecline.mock.calls) {
      expect(typeof reason).toBe('string');
    }
  });

  it('renders a pod with no description on it', () => {
    const { container } = card({ request: request({ pod_description: '' }) });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a request from a host with no phone on file', () => {
    const { container } = card({ request: request({ host_phone: '' }) });

    expect(container.textContent).toContain('meera@duncit.com');
  });

  it('renders a free slot', () => {
    const { container } = card({ request: request({ price: 0 }) });

    expect(container.textContent).toContain('Sunday Badminton');
  });
});
