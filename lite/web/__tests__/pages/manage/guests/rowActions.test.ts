import { describe, expect, it } from 'vitest';
import { DESTRUCTIVE_ACTIONS, actionsFor } from '../../../../pages/manage/guests/rowActions';

describe('actionsFor', () => {
  it('lets a host approve, decline or remove a guest awaiting approval', () => {
    expect(actionsFor('PENDING_APPROVAL', false)).toEqual(['APPROVE', 'DECLINE', 'REMOVE']);
  });

  it('lets a host confirm or reject a pending payment, decline or remove', () => {
    expect(actionsFor('PAYMENT_PENDING', false)).toEqual(['CONFIRM_PAYMENT', 'REJECT_PAYMENT', 'DECLINE', 'REMOVE']);
  });

  it('offers decline and remove for the waitlist', () => {
    expect(actionsFor('WAITLISTED', false)).toEqual(['DECLINE', 'REMOVE']);
  });

  it('checks a confirmed guest in, or undoes a check-in already made', () => {
    expect(actionsFor('CONFIRMED', false)).toEqual(['CHECK_IN', 'REMOVE']);
    expect(actionsFor('CONFIRMED', true)).toEqual(['UNDO_CHECK_IN', 'REMOVE']);
  });

  it('only removes a declined guest', () => {
    expect(actionsFor('DECLINED', false)).toEqual(['REMOVE']);
  });

  it('offers nothing for a cancelled registration', () => {
    expect(actionsFor('CANCELLED', false)).toEqual([]);
    expect(actionsFor('CANCELLED', true)).toEqual([]);
  });
});

describe('DESTRUCTIVE_ACTIONS', () => {
  it('asks first for every action that takes something away', () => {
    expect([...DESTRUCTIVE_ACTIONS].sort((a, b) => a.localeCompare(b))).toEqual(['DECLINE', 'REJECT_PAYMENT', 'REMOVE']);
  });

  it('never asks before an approval, a payment confirmation or a check-in', () => {
    for (const action of ['APPROVE', 'CONFIRM_PAYMENT', 'CHECK_IN', 'UNDO_CHECK_IN'] as const) {
      expect(DESTRUCTIVE_ACTIONS.has(action)).toBe(false);
    }
  });
});
