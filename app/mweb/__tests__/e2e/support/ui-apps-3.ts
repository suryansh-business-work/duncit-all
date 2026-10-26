/// <reference types="cypress" />
import { CONSENT_COOKIE, makeConsent, serializeConsent } from '@duncit/utils';
import { runAccount } from './run-account';

/**
 * Shared steps for the third batch of mWeb UI specs (specs/ui/**): the shop,
 * the public venue and host pages, saved items, studios and the account pages
 * a plain member reaches.
 *
 * Everything a scenario needs from staging is read here first, through the same
 * public queries the app runs, and a missing prerequisite fails with a sentence
 * that names it — a scenario never passes because the data was not there.
 * The only writes are the run account's own: its saved pods, its header city
 * and its tracking choice, each put back by the spec that changed it.
 */

/** A well-formed ObjectId no record carries — what an unknown link points at. */
export const NO_SUCH_ID = '00000000000000000000e2e0';

// ---------------------------------------------------------------- the page

/**
 * Answer the tracking-consent banner before the page loads, as a member who has
 * declined optional tracking. The banner sits over the bottom of the screen,
 * where the cart, the buy bar and the pay buttons live.
 */
export function declineTracking(): void {
  const domain = new URL(String(Cypress.config('baseUrl'))).hostname;
  const choice = makeConsent({ analytics: false, marketing: false });
  cy.setCookie(CONSENT_COOKIE, encodeURIComponent(serializeConsent(choice)), { domain, log: false });
}

/** Visit `path` and wait for the server's answer to `operation`. */
export function visitAndWait(path: string, operation: string): void {
  cy.interceptOperation(operation);
  cy.visitApp(path);
  cy.wait(`@${operation}`);
}

/** Signed out, `path` is replaced by sign-in with the path kept as `?redirect`. */
export function expectSignInFor(path: string): void {
  cy.location('pathname').should('eq', '/login');
  cy.location('search').should('eq', `?redirect=${encodeURIComponent(path)}`);
  cy.byTestId('login-screen').should('exist');
}

/**
 * On the sign-in screen a guard (or a public page) parked the visitor on,
 * sign in as the run account with its password, the way a member does.
 */
export function signInFromHere(): void {
  const account = runAccount();
  cy.byTestId('continue-with-password').click();
  cy.byTestId('field-email').type(account.email);
  cy.byTestId('field-password').type(account.password('CHANGED'), { log: false });
  cy.interceptOperation('Login');
  cy.byTestId('login-submit').click();
  cy.wait('@Login');
}

// ---------------------------------------------------------------- flags

const PUBLIC_FLAGS = `query E2eUi3Flags { publicFeatureFlags { key enabled } }`;

/** Whether a public feature flag is on — read the way the app reads it. */
export const publicFlag = (key: string): Cypress.Chainable<boolean> =>
  cy
    .gql<{ publicFeatureFlags: Array<{ key: string; enabled: boolean }> }>(PUBLIC_FLAGS, {}, { token: null })
    .then(({ publicFeatureFlags }) => publicFeatureFlags.some((flag) => flag.key === key && flag.enabled === true));

/** Every product page exists only while `is_product_visible` is on. */
export function requireProductsOn(): void {
  publicFlag('is_product_visible').then((on) => {
    if (!on) {
      throw new Error(
        'Staging prerequisite: the is_product_visible system flag is off, so /shop, /cart, /product and /orders send every member home.',
      );
    }
  });
}

// ---------------------------------------------------------------- money

const PUBLIC_FINANCE = `query E2eUi3Currency { publicFinanceSettings { currency_symbol } }`;

/** The currency symbol the app prices with (`usePricing`), ₹ when Finance has none. */
export const currencySymbol = (): Cypress.Chainable<string> =>
  cy
    .gql<{ publicFinanceSettings: { currency_symbol: string | null } | null }>(PUBLIC_FINANCE)
    .then((data) => data.publicFinanceSettings?.currency_symbol ?? '₹');

/** `usePricing().format`: whole amounts without decimals, others to two places. */
export function priceText(amount: number, currency: string): string {
  const total = Math.round(Math.max(0, amount) * 100) / 100;
  return `${currency}${total.toFixed(total % 1 === 0 ? 0 : 2)}`;
}

/** `formatRupees` (the product page): rounded, Indian digit grouping. */
export const rupees = (amount: number): string => `₹${Math.round(amount).toLocaleString('en-IN')}`;

// ---------------------------------------------------------------- products

export interface ShopProduct {
  id: string;
  product_name: string;
  brand_name: string | null;
  unit_cost: number;
  pod_available_count: number;
}

export interface ProductPod {
  pod_id: string;
  pod_title: string;
  unit_cost: number;
  available_count: number;
}

export interface ProductVariant {
  id: string;
  option_label: string | null;
  color: string | null;
  size_label: string | null;
  unit_cost: number | null;
}

export interface ProductDetail {
  id: string;
  product_name: string;
  brand_name: string | null;
  unit_cost: number;
  variants: ProductVariant[];
}

/** A product the shop can sell, the pod a quick add or the buy bar picks, and its details. */
export interface StockedProduct {
  product: ShopProduct;
  pod: ProductPod;
  detail: ProductDetail;
}

const SHOP_PRODUCTS = `query E2eUi3ShopProducts {
  availablePodProducts { id product_name brand_name unit_cost pod_available_count }
}`;

const PODS_FOR_PRODUCT = `query E2eUi3PodsForProduct($id: ID!) {
  podsForProduct(product_doc_id: $id) { pod_id pod_title unit_cost available_count }
}`;

const PRODUCT_DETAIL = `query E2eUi3Product($id: ID!) {
  publicInventoryProduct(product_doc_id: $id) {
    id product_name brand_name unit_cost
    variants { id option_label color size_label unit_cost }
  }
}`;

/** Every product the Pod Shop lists, in the order the server returns them. */
export const shopProducts = (): Cypress.Chainable<ShopProduct[]> =>
  cy.gql<{ availablePodProducts: ShopProduct[] }>(SHOP_PRODUCTS).then((data) => data.availablePodProducts);

/** The pod the app adds a product from: the cheapest, first among equals (a stable sort, as the app's). */
export const cheapestPod = (productId: string): Cypress.Chainable<ProductPod | null> =>
  cy
    .gql<{ podsForProduct: ProductPod[] }>(PODS_FOR_PRODUCT, { id: productId })
    .then(({ podsForProduct }) =>
      cy.wrap<ProductPod | null>([...podsForProduct].sort((a, b) => a.unit_cost - b.unit_cost)[0] ?? null, { log: false }),
    );

export const productDetail = (productId: string): Cypress.Chainable<ProductDetail> =>
  cy
    .gql<{ publicInventoryProduct: ProductDetail | null }>(PRODUCT_DETAIL, { id: productId })
    .then(({ publicInventoryProduct }) => {
      if (!publicInventoryProduct) throw new Error(`Product ${productId} is listed in the shop but has no public details.`);
      return publicInventoryProduct;
    });

/**
 * The first shop product whose cheapest pod holds at least `minStock` units and
 * that matches `accept` (on its details) — the product the cart and buy-bar
 * scenarios step up and down.
 */
export function stockedProduct(
  minStock: number,
  accept: (detail: ProductDetail, pod: ProductPod) => boolean = () => true,
  need = `a product whose cheapest pod holds at least ${minStock} units`,
): Cypress.Chainable<StockedProduct> {
  return shopProducts().then((products) => {
    const candidates = products.filter((product) => product.pod_available_count >= minStock);
    const tryAt = (index: number): Cypress.Chainable<StockedProduct> => {
      if (index >= candidates.length) {
        throw new Error(`Staging prerequisite: the Pod Shop has no ${need} (Admin > Products, pod stock).`);
      }
      const product = candidates[index];
      return cheapestPod(product.id).then((pod) =>
        productDetail(product.id).then((detail) => {
          if (pod && pod.available_count >= minStock && accept(detail, pod)) {
            return cy.wrap<StockedProduct>({ product, pod, detail }, { log: false });
          }
          return tryAt(index + 1);
        }),
      );
    };
    return tryAt(0);
  });
}

/**
 * Wait (on an `interceptOperation('SyncMyProductCart')` set up before the step
 * that emptied the cart) until the server's mirror of the cart is sent empty.
 * A signed-in cart is mirrored for the "your cart is calling" reminder
 * (useCartServerSync): lines go after a 2 s settle, an emptied cart at once.
 */
export function waitCartMirrorEmpty(triesLeft = 3): void {
  cy.wait('@SyncMyProductCart').then((interception) => {
    const lines: unknown[] = interception.request.body?.variables?.lines ?? [];
    if (lines.length === 0) return;
    if (triesLeft <= 0) throw new Error('The cart mirror was never sent empty.');
    waitCartMirrorEmpty(triesLeft - 1);
  });
}

/** Clear this browser's cart from /cart and wait until the server's mirror of it is empty too. */
export function clearCart(): void {
  cy.visitApp('/cart');
  cy.byTestId('cart-clear').should('be.visible');
  cy.interceptOperation('SyncMyProductCart');
  cy.byTestId('cart-clear').click();
  waitCartMirrorEmpty();
  cy.byTestId('cart-empty').should('be.visible');
}

/** What the product page labels a variant pill (`variantName`). */
export const variantName = (variant: ProductVariant): string =>
  variant.option_label || variant.color || variant.size_label || 'Variant';

/** The cart line key a product page line gets (`cartLineKey`): the product, or product::variant. */
export const lineKey = (productId: string, variantId: string): string =>
  variantId ? `${productId}::${variantId}` : productId;

// ---------------------------------------------------------------- the run account

const ME_PLACE = `query E2eUi3MePlace { me { user_id username selected_location_id } }`;
const SET_PLACE = `mutation E2eUi3SetPlace($locationId: ID, $zoneName: String) {
  setMySelectedLocation(location_id: $locationId, zone_name: $zoneName) { user_id selected_location_id }
}`;

export interface MePlace {
  user_id: string;
  username: string;
  selected_location_id: string | null;
}

export const mePlace = (): Cypress.Chainable<MePlace> =>
  cy.gql<{ me: MePlace }>(ME_PLACE).then((data) => data.me);

/**
 * Set the run account's own header city (what the header opens on), so a page
 * in that city opens without the "different location" dialog — or, on purpose,
 * with it.
 */
export function setHeaderCity(locationId: string | null): void {
  cy.gql(SET_PLACE, { locationId, zoneName: null });
}

// ---------------------------------------------------------------- places

export interface PlaceName {
  id: string;
  location_name: string;
}

const LOCATIONS = `query E2eUi3Locations { locations { id location_name } }`;

export const locations = (): Cypress.Chainable<PlaceName[]> =>
  cy.gql<{ locations: PlaceName[] }>(LOCATIONS).then((data) => data.locations);

export interface PublicVenueRow {
  id: string;
  venue_name: string;
  location_id: string | null;
  offers_food: boolean | null;
}

const PUBLIC_VENUES = `query E2eUi3PublicVenues { publicVenues { id venue_name location_id offers_food } }`;

/** Every APPROVED, active venue — the ones `/venue/:id` shows. */
export const publicVenues = (): Cypress.Chainable<PublicVenueRow[]> =>
  cy.gql<{ publicVenues: PublicVenueRow[] }>(PUBLIC_VENUES).then((data) => data.publicVenues);

export interface ListedPod {
  id: string;
  pod_id: string | null;
  pod_title: string;
  pod_description: string | null;
  club_id: string | null;
  club_slug: string | null;
  venue_id: string | null;
  location_id: string | null;
  pod_type: string;
  pod_mode: string | null;
  pod_date_time: string;
  no_of_spots: number;
  seats_available: number | null;
  pod_hosts_id: string[];
  pod_attendees: string[];
  is_deleted: boolean | null;
}

const LISTED_PODS = `query E2eUi3ListedPods($filter: PodFilterInput) {
  pods(filter: $filter) {
    id pod_id pod_title pod_description club_id club_slug venue_id location_id
    pod_type pod_mode pod_date_time no_of_spots seats_available pod_hosts_id pod_attendees is_deleted
  }
}`;

/** The live pods the app lists (`pods(filter: { is_active: true, … })`). */
export const listedPods = (filter: Record<string, unknown> = {}): Cypress.Chainable<ListedPod[]> =>
  cy
    .gql<{ pods: ListedPod[] }>(LISTED_PODS, { filter: { is_active: true, ...filter } })
    .then((data) => data.pods.filter((pod) => !pod.is_deleted));

/** Starts at least `leadMs` from now and can be opened by its link. */
export const isUpcomingLinkable = (pod: ListedPod, leadMs = 60 * 60 * 1000): boolean =>
  Date.parse(pod.pod_date_time) > Date.now() + leadMs && !!pod.club_slug && !!pod.pod_id;

/** `podUrl`: where a pod card or a pod link opens. */
export const podPath = (pod: Pick<ListedPod, 'club_slug' | 'pod_id'>): string =>
  `/club/${pod.club_slug}/pod/${pod.pod_id}`;
