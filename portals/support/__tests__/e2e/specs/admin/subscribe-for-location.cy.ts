import { tableRow } from '../../support/tables';
import { specMarker, wideViewport } from '../../support/ui-staff';
import {
  adminRaw,
  cityAdminSeat,
  createMarkedCity,
  deleteMarkedLocations,
  expectError,
  releaseAdminRoles,
  signInAdmin,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Catalog › Subscribe for location (/location-subscriptions): the
 * people waiting for a city that is not live yet, as a City Admin
 * (locationSubscription.resolver.ts ADMIN_WRITE = SUPER_ADMIN, CITY_ADMIN).
 *
 * The spec files its own not-launched city (marker-named, through the API)
 * and the run account joins its waitlist the way a member does
 * (`subscribeLocationLaunch`, which needs the WhatsApp number on the
 * profile). The launch message itself is never sent — that is a WhatsApp
 * template to a real number — only its refusal for a city that is not live.
 */

interface SubscriptionRow {
  id: string;
  city: string;
  user_id: string;
  status: string;
}

const SUBSCRIBE = `mutation E2eSubscribeLaunch($id: ID!) {
  subscribeLocationLaunch(location_doc_id: $id) { is_subscribed subscriber_count }
}`;
const SUBSCRIPTIONS = `query E2eLocationSubscriptions($query: TableQueryInput) {
  locationSubscriptionsTable(query: $query) { rows { id city user_id status } }
}`;
const SEND = `mutation E2eSendLaunch($id: ID!) { sendLocationLaunchMessage(location_doc_id: $id) { queued } }`;

const CITIES_TABLE = 'admin-location-subscription-cities';
const SUBSCRIBERS_TABLE = 'admin-location-subscriptions';

describe('Admin · Subscribe for location (City Admin, run account)', () => {
  let seat: AdminSeat;
  let marker: string;
  let city: { id: string; city: string };
  let subscription: SubscriptionRow;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      marker = specMarker(s.account, 'admin-wait');
      createMarkedCity(`${marker} Town`).then((created) => {
        city = created;
        cy.gql<{ subscribeLocationLaunch: { is_subscribed: boolean } }>(SUBSCRIBE, { id: created.id })
          .its('subscribeLocationLaunch.is_subscribed')
          .should('eq', true);
        cy.gql<{ locationSubscriptionsTable: { rows: SubscriptionRow[] } }>(SUBSCRIPTIONS, {
          query: { search: marker, page: 1, page_size: 10 },
        }).then((data) => {
          const own = data.locationSubscriptionsTable.rows.find((r) => r.user_id === s.userId);
          if (!own) throw new Error('The run account’s waitlist entry for the spec’s city was not found.');
          subscription = own;
        });
      });
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    if (!seat) return;
    signInAdmin(seat.account);
    deleteMarkedLocations(marker);
    releaseAdminRoles(seat.account);
  });

  it('LSB-01 a waiting city shows its totals; picking it lists who is waiting', () => {
    wideViewport();
    cy.interceptOperation('LocationSubscriptionCities');
    cy.visitPortal('admin', '/location-subscriptions');
    cy.wait('@LocationSubscriptionCities');
    cy.byTestId('location-subscriptions-pick-city').should(
      'have.text',
      'Select a city above to see who is waiting for it.',
    );
    cy.byTestId('table-toolbar-search').first().type(marker, { delay: 0 });
    tableRow(CITIES_TABLE, city.id, [city.city, 'Not launched']).click(24, 16);
    cy.byTestId('location-subscriptions-selected-city').should(
      'have.text',
      `Showing the people waiting for ${city.city}.`,
    );
    cy.byTestId(`${SUBSCRIBERS_TABLE}-row-${subscription.id}`).should('be.visible');
    expect(subscription.status).to.eq('PENDING');
  });

  it('LSB-02 Send stays locked until the city launches, and the server refuses it too', () => {
    wideViewport();
    cy.visitPortal('admin', '/location-subscriptions');
    cy.byTestId('table-toolbar-search').first().type(marker, { delay: 0 });
    cy.byTestId(`${CITIES_TABLE}-row-${city.id}`).within(() => {
      cy.byTestId('location-subscriptions-send').should('be.disabled').parent().trigger('mouseover');
    });
    cy.get('[role="tooltip"]').should('contain.text', 'Switch Launched on for this city in Catalog > Locations first.');
    adminRaw(SEND, { id: city.id }).then((body) =>
      expectError(body, `Switch Launched on for ${city.city} before sending the launch message.`),
    );
  });
});
