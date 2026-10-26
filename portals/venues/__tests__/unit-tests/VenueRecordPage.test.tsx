import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The record page hands the shared venue page its extra tabs. The shared page
 * and the food and rental desks are other packages' subjects, so they are
 * stand-ins that expose the props they were given.
 */
interface ExtraTab {
  value: string;
  label: string;
  render: () => ReactNode;
}
interface Venue {
  id: string;
  offers_food: boolean;
}

const captured = vi.hoisted(() => ({ extraTabs: null as null | ((venue: Venue) => ExtraTab[]) }));

vi.mock('@duncit/entity-consoles', () => ({
  VenueDetailsPage: ({ extraTabs }: { extraTabs: (venue: Venue) => ExtraTab[] }) => {
    captured.extraTabs = extraTabs;
    return null;
  },
}));
vi.mock('@duncit/venue-food', () => ({
  VenueFoodMenu: () => null,
  VenueFoodDashboard: () => null,
  VenueFoodOrders: () => null,
  VenueFoodCoupons: () => null,
}));
vi.mock('@duncit/venue-rentals', () => ({ VenueRentalDesk: () => null }));
vi.mock('@duncit/buttons', () => ({ DuncitButton: () => null }));
vi.mock('@duncit/logs', () => ({ logs: { portal: { venues: 'venues-logger' } } }));
vi.mock('@duncit/shell', () => ({ useTranslation: () => ({ t: (key: string) => `t:${key}` }) }));

import { VenueFoodCoupons, VenueFoodDashboard, VenueFoodMenu, VenueFoodOrders } from '@duncit/venue-food';
import { VenueRentalDesk } from '@duncit/venue-rentals';
import VenueRecordPage from '../../src/VenueRecordPage';

const tabsFor = (venue: Venue): ExtraTab[] => {
  renderToStaticMarkup(
    <MemoryRouter>
      <VenueRecordPage />
    </MemoryRouter>,
  );
  if (!captured.extraTabs) throw new Error('the venue page was never given its extra tabs');
  return captured.extraTabs(venue);
};
const elementOf = (tab: ExtraTab): ReactElement<Record<string, unknown>> => {
  const node = tab.render();
  if (!isValidElement<Record<string, unknown>>(node)) throw new Error(`tab ${tab.value} did not render an element`);
  return node;
};

beforeEach(() => {
  captured.extraTabs = null;
});

describe('VenueRecordPage', () => {
  it('gives a venue that serves no food only the menu, where food is switched on, and the rental desk', () => {
    const tabs = tabsFor({ id: 'v1', offers_food: false });
    expect(tabs.map((tab) => tab.value)).toEqual(['foodMenu', 'rentedItems']);
    expect(tabs.map((tab) => tab.label)).toEqual(['t:venueFoodOwner.menu.title', 't:venueRentals.items.pageTitle']);
  });

  it('adds the food dashboard, order board and coupons for a venue that serves food, in that order', () => {
    const tabs = tabsFor({ id: 'v1', offers_food: true });
    expect(tabs.map((tab) => tab.value)).toEqual(['foodMenu', 'foodDashboard', 'foodOrders', 'foodCoupons', 'rentedItems']);
    expect(tabs.map((tab) => tab.label)).toEqual([
      't:venueFoodOwner.menu.title',
      't:venueFoodOwner.dashboard.title',
      't:venueFoodOwner.orders.title',
      't:venueFoodOwner.coupons.title',
      't:venueRentals.items.pageTitle',
    ]);
  });

  it('opens the menu as an admin with the status-only payment account, keyed by the venue', () => {
    const [menu] = tabsFor({ id: 'v7', offers_food: false });
    const element = elementOf(menu);
    expect(element.type).toBe(VenueFoodMenu);
    expect(element.key).toBe('v7');
    expect(element.props).toMatchObject({
      venueId: 'v7',
      surface: 'venues',
      mode: 'admin',
      account: { kind: 'status' },
      logger: 'venues-logger',
    });
  });

  it('offers an unapproved venue a way to edit it from the menu tab', () => {
    const [menu] = tabsFor({ id: 'v7', offers_food: false });
    const action = (elementOf(menu).props.notApprovedAction as ReactElement<Record<string, unknown>>);
    expect(action.props).toMatchObject({ to: '/venues/v7/edit', size: 'small', color: 'inherit' });
    expect(action.props.children).toBe('t:venueFoodOwner.common.editVenue');
  });

  it('points each food desk at the venue, under the console surface', () => {
    const tabs = tabsFor({ id: 'v9', offers_food: true });
    const byValue = new Map(tabs.map((tab) => [tab.value, elementOf(tab)]));

    const dashboard = byValue.get('foodDashboard');
    expect(dashboard?.type).toBe(VenueFoodDashboard);
    expect(dashboard?.key).toBe('v9');
    expect(dashboard?.props).toMatchObject({ venueId: 'v9', logger: 'venues-logger' });

    const orders = byValue.get('foodOrders');
    expect(orders?.type).toBe(VenueFoodOrders);
    expect(orders?.key).toBe('v9');
    expect(orders?.props).toMatchObject({ venueId: 'v9', surface: 'venues' });

    const coupons = byValue.get('foodCoupons');
    expect(coupons?.type).toBe(VenueFoodCoupons);
    expect(coupons?.key).toBe('v9');
    expect(coupons?.props).toMatchObject({ venueId: 'v9', surface: 'venues' });
  });

  it('opens the rental desk as an admin for the venue', () => {
    const tabs = tabsFor({ id: 'v3', offers_food: false });
    const rentals = elementOf(tabs.at(-1) as ExtraTab);
    expect(rentals.type).toBe(VenueRentalDesk);
    expect(rentals.key).toBe('v3');
    expect(rentals.props).toMatchObject({ venueId: 'v3', surface: 'venues', mode: 'admin' });
  });
});
