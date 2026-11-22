/**
 * The Finance sidebar's structure: main sections, each with its own
 * sub-navigation. Regrouping must never lose a destination — a bookmark or a
 * link in an email still has to land somewhere — so the full set of routes the
 * sidebar reached before the restructure is pinned here.
 */
import { describe, expect, it } from 'vitest';
import type { AppNavItem } from '@duncit/shell';
import { appConfig } from '../../src/config/app-config';

const nav = appConfig.nav as readonly AppNavItem[];

const leaves = (items: readonly AppNavItem[]): AppNavItem[] =>
  items.flatMap((item) => (item.children ? leaves(item.children) : [item]));

/** Every destination the sidebar offered before it was regrouped. */
const PREVIOUS_ROUTES = [
  '/',
  '/startup-dashboard',
  '/default-deductions',
  '/food-menu-defaults',
  '/rented-items',
  '/rented-items/settings',
  '/pod-finance',
  '/cancellations',
  '/backout-refunds',
  '/cancellations/venue',
  '/cancellations/host',
  '/user-refund-logs',
  '/payment-logs',
  '/round-offs',
  '/pod-shop/payment-logs',
  '/pod-shop/order-refunds',
  '/ecomm/payment-logs',
  '/ecomm/order-refunds',
  '/payment-release',
  '/withdrawals',
  '/withdrawals/settings',
  '/invoices',
  '/invoices/venue',
  '/invoices/host',
  '/invoices/product',
  '/expenses/dashboard',
  '/ledger',
  '/pod-expenses',
  '/employee-expenses',
  '/payouts',
  '/settings/expenses',
  '/calculators/pod-profit',
];

describe('the Finance sidebar', () => {
  const destinations = leaves(nav).map((item) => item.to);

  it('is organised as main sections that each carry their own sub-navigation', () => {
    expect(nav.length).toBeGreaterThan(5);
    for (const section of nav) {
      expect(section.children?.length, `${section.label} has no sub-navigation`).toBeGreaterThan(0);
      expect(section.to, `${section.label} is a heading, not a link`).toBeUndefined();
    }
  });

  it('keeps every destination it reached before, so no bookmark or emailed link breaks', () => {
    for (const route of PREVIOUS_ROUTES) {
      expect(destinations, `${route} was dropped`).toContain(route);
    }
  });

  it('lists each destination once under one section', () => {
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  it('puts withdrawals and Send Money together under Money Out, with their logs', () => {
    const moneyOut = nav.find((section) => section.label === 'Money Out');
    expect(moneyOut?.children?.map((item) => item.to)).toEqual([
      '/withdrawals',
      '/withdrawals/logs',
      '/withdrawals/settings',
      '/send-money',
      '/send-money/logs',
    ]);
  });

  it('keeps the two shops in their own sections, never mixed into one list', () => {
    const podShop = nav.find((section) => section.label === 'Pod Shop');
    const ecomm = nav.find((section) => section.label === 'Ecomm (Pet Store)');
    expect(podShop?.children?.every((item) => item.to?.startsWith('/pod-shop/'))).toBe(true);
    expect(ecomm?.children?.every((item) => item.to?.startsWith('/ecomm/'))).toBe(true);
  });

  it('gives every item a translation key, so the sidebar localizes', () => {
    for (const item of [...nav, ...leaves(nav)]) {
      expect(item.labelKey, `${item.label} has no labelKey`).toMatch(/^shell\.nav\./);
    }
  });
});
