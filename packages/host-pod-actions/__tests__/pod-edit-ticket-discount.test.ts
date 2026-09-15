/**
 * The multi-ticket discount inside the host's Edit Pod sheet: what the pod
 * stores, whether it can carry a discount at all, and when an edit needs
 * re-validating. The tier rules themselves are @duncit/utils' and tested there.
 */
import type { FieldError } from 'react-hook-form';
import type { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import { mwebHostPodLabels } from '../src/labels';
import {
  isFreePodPrice,
  podEditTicketDiscount,
  podTicketDiscountValues,
  refinePodEditTicketDiscount,
  ticketDiscountFieldErrors,
  type PodEditTicketDiscount,
} from '../src/pod-edit-ticket-discount';
import type { HostPodTarget } from '../src/types';

const labels = mwebHostPodLabels((key) => `t:${key}`).ticketDiscount;

const tiers = [
  { min_tickets: 2, discount_pct: 10 },
  { min_tickets: 4, discount_pct: 20 },
];

const stored = { ticket_discount_enabled: true, ticket_discount_tiers: tiers };
const paid: PodEditTicketDiscount = { free: false, maxPct: 30, stored };

/** A RefinementCtx that records what the refine raised. */
const recordingCtx = () => {
  const addIssue = vi.fn();
  return { ctx: { addIssue, value: undefined } as unknown as z.RefinementCtx, addIssue };
};

describe('isFreePodPrice', () => {
  it('reads a FREE type as free, whatever price it carries', () => {
    expect(isFreePodPrice({ pod_type: 'FREE', pod_amount: 499 })).toBe(true);
  });

  it('reads a zero or missing price as free, whatever the type says', () => {
    expect(isFreePodPrice({ pod_type: 'PAID', pod_amount: 0 })).toBe(true);
    expect(isFreePodPrice({ pod_type: null, pod_amount: null })).toBe(true);
    expect(isFreePodPrice({})).toBe(true);
  });

  it('reads a priced PAID pod as able to carry a discount', () => {
    expect(isFreePodPrice({ pod_type: 'PAID', pod_amount: 499 })).toBe(false);
  });
});

describe('podTicketDiscountValues', () => {
  it('opens switched off with no tiers when there is no pod', () => {
    expect(podTicketDiscountValues(null)).toEqual({
      ticket_discount_enabled: false,
      ticket_discount_tiers: [],
    });
  });

  it('only a stored true switches the discount on', () => {
    const pod = {
      id: 'DUN-POD-4821',
      pod_title: 'Sunday Badminton',
      ticket_discount_enabled: null,
      ticket_discount_tiers: tiers,
    } as HostPodTarget;
    expect(podTicketDiscountValues(pod)).toEqual({ ticket_discount_enabled: false, ticket_discount_tiers: tiers });
  });
});

describe('podEditTicketDiscount', () => {
  it('has no context without a pod', () => {
    expect(podEditTicketDiscount(null, 30)).toBeNull();
  });

  // Without the tiers the form would start "off" and a save would switch the
  // host's real discount off with it.
  it('has no context when the list that opened the dialog never selected the tiers', () => {
    expect(podEditTicketDiscount({ id: 'DUN-POD-4821', pod_amount: 499 } as HostPodTarget, 30)).toBeNull();
    expect(
      podEditTicketDiscount({ id: 'DUN-POD-4821', ticket_discount_tiers: null } as HostPodTarget, 30),
    ).toBeNull();
  });

  it('carries the stored discount, the admin max and whether the pod is free', () => {
    const pod = {
      id: 'DUN-POD-4821',
      pod_title: 'Sunday Badminton',
      pod_type: 'PAID',
      pod_amount: 499,
      ticket_discount_enabled: true,
      ticket_discount_tiers: tiers,
    } as HostPodTarget;

    expect(podEditTicketDiscount(pod, 30)).toEqual({ free: false, maxPct: 30, stored });
    expect(podEditTicketDiscount({ ...pod, pod_type: 'FREE' }, 30)?.free).toBe(true);
  });
});

describe('refinePodEditTicketDiscount', () => {
  const run = (values: Parameters<typeof refinePodEditTicketDiscount>[0], discount = paid) => {
    const { ctx, addIssue } = recordingCtx();
    refinePodEditTicketDiscount(values, ctx, discount, labels);
    return addIssue;
  };
  const limits = { maxPct: 30, maxTickets: 7, maxTiers: 10 };

  it('never checks a free pod, whose discount the input clears anyway', () => {
    const edited = { ticket_discount_enabled: true, ticket_discount_tiers: [], no_of_spots: 8 };
    expect(run(edited, { ...paid, free: true })).not.toHaveBeenCalled();
  });

  // An admin lowering the global max must not stop a host fixing a typo in their title.
  it('does not re-check a discount left exactly as stored', () => {
    expect(run({ ...stored, no_of_spots: 8 }, { ...paid, maxPct: 5 })).not.toHaveBeenCalled();
  });

  it('finds nothing wrong with a discount the host switched off', () => {
    const addIssue = run({ ticket_discount_enabled: false, ticket_discount_tiers: tiers, no_of_spots: 8 });
    expect(addIssue).not.toHaveBeenCalled();
  });

  it('pins a list-level issue on the tiers themselves', () => {
    const addIssue = run({ ticket_discount_enabled: true, ticket_discount_tiers: [], no_of_spots: 8 });

    expect(addIssue).toHaveBeenCalledWith({
      code: 'custom',
      path: ['ticket_discount_tiers'],
      message: labels.errors.TIERS_REQUIRED(limits),
    });
  });

  it('pins a row issue on the field it is about, once any tier changed', () => {
    const addIssue = run({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [tiers[0], { min_tickets: 4, discount_pct: 10 }],
      no_of_spots: 8,
    });

    expect(addIssue).toHaveBeenCalledTimes(1);
    expect(addIssue).toHaveBeenCalledWith({
      code: 'custom',
      path: ['ticket_discount_tiers', 1, 'discount_pct'],
      message: labels.errors.PCT_NOT_INCREASING(limits),
    });
  });

  it('re-checks when only the tickets of a tier changed', () => {
    const addIssue = run({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [tiers[0], { min_tickets: 9, discount_pct: 20 }],
      no_of_spots: 8,
    });

    expect(addIssue).toHaveBeenCalledWith({
      code: 'custom',
      path: ['ticket_discount_tiers', 1, 'min_tickets'],
      message: labels.errors.TICKETS_MAX(limits),
    });
  });

  it('re-checks when a tier was added', () => {
    const addIssue = run({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [...tiers, { min_tickets: 5, discount_pct: 40 }],
      no_of_spots: 8,
    });

    expect(addIssue).toHaveBeenCalledWith({
      code: 'custom',
      path: ['ticket_discount_tiers', 2, 'discount_pct'],
      message: labels.errors.PCT_MAX(limits),
    });
  });
});

describe('ticketDiscountFieldErrors', () => {
  it('reports nothing, with one empty slot per row, when the tiers are valid', () => {
    expect(ticketDiscountFieldErrors(undefined, 2)).toEqual({
      list: undefined,
      rows: [
        { min_tickets: undefined, discount_pct: undefined },
        { min_tickets: undefined, discount_pct: undefined },
      ],
    });
  });

  it('reads the list message and each row message from the resolver tree', () => {
    const error = {
      type: 'custom',
      message: 't:mweb.ticketDiscount.errorTooManyTiers',
      1: { discount_pct: { message: 't:mweb.ticketDiscount.errorPctMax' } },
    } as unknown as FieldError;

    expect(ticketDiscountFieldErrors(error, 2)).toEqual({
      list: 't:mweb.ticketDiscount.errorTooManyTiers',
      rows: [
        { min_tickets: undefined, discount_pct: undefined },
        { min_tickets: undefined, discount_pct: 't:mweb.ticketDiscount.errorPctMax' },
      ],
    });
  });
});
