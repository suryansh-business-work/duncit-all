import { describe, expect, it } from 'vitest';
import { isSoldOut } from '../../../components/register/TicketStep';
import { ticketFixture } from '../../test-utils';

describe('isSoldOut', () => {
  it('is never true for a ticket with no quantity limit', () => {
    expect(isSoldOut(ticketFixture({ quantity: null, sold: 10_000 }))).toBe(false);
  });

  it('is false while at least one seat remains', () => {
    expect(isSoldOut(ticketFixture({ quantity: 50, sold: 49 }))).toBe(false);
  });

  it('is true once every seat is taken', () => {
    expect(isSoldOut(ticketFixture({ quantity: 50, sold: 50 }))).toBe(true);
  });

  it('stays true when more were sold than the host later allowed', () => {
    expect(isSoldOut(ticketFixture({ quantity: 20, sold: 25 }))).toBe(true);
  });
});
