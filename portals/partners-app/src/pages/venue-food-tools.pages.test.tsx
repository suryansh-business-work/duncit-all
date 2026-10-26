import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { logs } from '@duncit/logs';
import VenueFoodDashboardPage from './venue-food-dashboard-page/VenueFoodDashboardPage';
import VenueFoodMenuPage from './venue-food-menu-page/VenueFoodMenuPage';
import VenueFoodOrdersPage from './venue-food-orders-page/VenueFoodOrdersPage';
import VenueRentedItemsPage from './venue-rented-items-page/VenueRentedItemsPage';
import { renderWithProviders } from '../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../__tests__/groupC-link';

/**
 * The tools themselves (menu editor, dashboard, orders board, rental desk) are
 * @duncit/venue-food's and @duncit/venue-rentals' and have their own suites. They
 * are stubbed to print what this console hands them, so these suites cover the
 * pages' own job: which venue they mount the tool for and with what.
 */
const { menuProps, dashboardProps } = vi.hoisted(() => ({
  menuProps: { current: null as Record<string, unknown> | null },
  dashboardProps: { current: null as Record<string, unknown> | null },
}));

vi.mock(import('@duncit/venue-food'), async (importOriginal) => ({
  ...(await importOriginal()),
  VenueFoodMenu: ((props: Record<string, unknown> & { onSaved: () => void; notApprovedAction: React.ReactNode }) => {
    menuProps.current = props;
    return (
      <section data-testid="stub-menu">
        {`menu:${String(props.venueId)}:${String(props.surface)}:${String(props.mode)}`}
        <button type="button" onClick={props.onSaved}>
          saved
        </button>
        {props.notApprovedAction}
      </section>
    );
  }) as never,
  VenueFoodDashboard: ((props: Record<string, unknown>) => {
    dashboardProps.current = props;
    return <section data-testid="stub-dashboard">{`dashboard:${String(props.venueId)}`}</section>;
  }) as never,
  VenueFoodOrders: ((props: { venueId: string; surface: string }) => (
    <section data-testid="stub-orders">{`orders:${props.venueId}:${props.surface}`}</section>
  )) as never,
}));

vi.mock(import('@duncit/venue-rentals'), async (importOriginal) => ({
  ...(await importOriginal()),
  VenueRentalDesk: ((props: { venueId: string; surface: string; mode: string }) => (
    <section data-testid="stub-rentals">{`rentals:${props.venueId}:${props.surface}:${props.mode}`}</section>
  )) as never,
}));

beforeEach(() => {
  globalThis.localStorage.clear();
  menuProps.current = null;
  dashboardProps.current = null;
});
afterEach(cleanup);

const venue = (id: string, name: string, offersFood = true) => ({
  __typename: 'Venue',
  id,
  venue_name: name,
  city: 'Pune',
  status: 'APPROVED',
  offers_food: offersFood,
});

const mount = (
  ui: React.ReactElement,
  venues: unknown[],
  answers: Record<string, ScriptedAnswer> = {},
  sent: SentOperation[] = [],
) =>
  renderWithProviders(ui, {
    route: '/venues/tool',
    link: scriptedLink({ VenueFoodOrderVenues: { myVenues: venues }, ...answers }, sent),
  });

describe('Food Menu page', () => {
  it('mounts the owner menu editor for the selected venue on this console’s surface', async () => {
    mount(<VenueFoodMenuPage />, [venue('v1', 'Blue Kettle')]);
    expect((await screen.findByTestId('stub-menu')).textContent).toContain('menu:v1:partners-app:owner');
    expect(screen.getByTestId('venue-food-menu-page')).toBeTruthy();
    expect(menuProps.current?.logger).toBe(logs.portal['partners-app']);
    expect(menuProps.current?.account).toMatchObject({ kind: 'picker' });
  });

  it('re-reads the venue list after a save, so the other food pages learn the venue serves food', async () => {
    const sent: SentOperation[] = [];
    mount(<VenueFoodMenuPage />, [venue('v1', 'Blue Kettle')], {}, sent);
    await screen.findByTestId('stub-menu');
    const reads = () => sent.filter((op) => op.name === 'VenueFoodOrderVenues').length;
    const before = reads();
    fireEvent.click(screen.getByRole('button', { name: 'saved' }));
    await waitFor(() => expect(reads()).toBe(before + 1));
  });

  it('offers a venue that is not approved the way to Food Settings', async () => {
    mount(<VenueFoodMenuPage />, [venue('v1', 'Blue Kettle')]);
    fireEvent.click(await screen.findByTestId('venue-food-menu-open-form'));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/venues/food-settings'));
  });

  it('shows the server message when the venues cannot be read', async () => {
    mount(<VenueFoodMenuPage />, [], { VenueFoodOrderVenues: new Error('Venues unavailable') });
    expect((await screen.findByTestId('venue-food-menu-error')).textContent).toBe('Venues unavailable');
    expect(screen.queryByTestId('stub-menu')).toBeNull();
  });
});

describe('Food Dashboard page', () => {
  it('mounts the dashboard for a venue that serves food, with this console’s logger', async () => {
    mount(<VenueFoodDashboardPage />, [venue('v1', 'Blue Kettle')]);
    expect((await screen.findByTestId('stub-dashboard')).textContent).toBe('dashboard:v1');
    expect(dashboardProps.current?.logger).toBe(logs.portal['partners-app']);
  });

  it('says why there are no numbers for a venue without food and points at Food Settings', async () => {
    mount(<VenueFoodDashboardPage />, [venue('v1', 'Blue Kettle', false)]);
    const alert = await screen.findByTestId('venue-food-dashboard-no-food');
    expect(alert.textContent).toContain('This venue does not offer food. Turn food on in its Food Menu section to see its food numbers.');
    expect(screen.queryByTestId('stub-dashboard')).toBeNull();
  });
});

describe('Food Orders page', () => {
  it('mounts the orders board for a venue that serves food', async () => {
    mount(<VenueFoodOrdersPage />, [venue('v1', 'Blue Kettle')]);
    expect((await screen.findByTestId('stub-orders')).textContent).toBe('orders:v1:partners-app');
  });

  it('says orders need food switched on for a venue without food', async () => {
    mount(<VenueFoodOrdersPage />, [venue('v1', 'Blue Kettle', false)]);
    const alert = await screen.findByTestId('venue-food-orders-no-food');
    expect(alert.textContent).toContain('This venue does not offer food. Turn food on in its Food Menu section to take orders.');
    expect(screen.queryByTestId('stub-orders')).toBeNull();
  });
});

describe('Rented Items page', () => {
  it('mounts the rental desk for the selected venue, food or not', async () => {
    mount(<VenueRentedItemsPage />, [venue('v1', 'Blue Kettle', false)]);
    expect((await screen.findByTestId('stub-rentals')).textContent).toBe('rentals:v1:partners-app:owner');
    // The title and hint come from the server catalogue; with none loaded the key itself shows.
    expect(screen.getByTestId('venue-rented-items-page').textContent).toContain('venueRentals.items.pageTitle');
  });

  it('shows the server message when the venues cannot be read', async () => {
    mount(<VenueRentedItemsPage />, [], { VenueFoodOrderVenues: new Error('Venues unavailable') });
    expect((await screen.findByTestId('venue-rented-items-error')).textContent).toBe('Venues unavailable');
    expect(screen.queryByTestId('stub-rentals')).toBeNull();
  });
});
