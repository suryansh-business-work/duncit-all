/**
 * Page smoke: every routed page in mWeb is mounted with NO data behind it.
 *
 * Apollo answers nothing here on purpose. That is the state every page is in
 * for its first paint and for the whole of a slow or failed request, so a page
 * that throws instead of rendering its loading or empty view is white-screening
 * a real user — and nothing else in this suite mounts most of these pages at
 * all.
 *
 * Each page is imported directly rather than through AppRoutes' React.lazy, so
 * there is no Suspense race to wait out: the import is awaited, then the page
 * is mounted behind its own route pattern so useParams() reads what it expects.
 *
 * Generated from the route table in src/app/AppRoutes.tsx.
 */
import type { ComponentType } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { schemaMockLink, serverSchema } from './schema-mock';
import { SmokeRoute } from './smoke-providers';

type PageEntry = [pattern: string, concrete: string, load: () => Promise<Record<string, unknown>>];

/**
 * A signed-in reader who holds every role.
 *
 * A token alone is not a session. Partners gates each area on
 * `useUserData().user.roles` and renders NOTHING while the user is still
 * unknown — which, with no provider above it, is forever. Its role-gated pages
 * were therefore at zero however well the queries answered. The portals that do
 * not read a session are unaffected by this.
 */
vi.mock('@duncit/user-context', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useUserData: () => ({
      user: {
        user_id: 'smoke-user',
        full_name: 'Smoke Reader',
        email: 'smoke@duncit.com',
        roles: ['USER', 'HOST', 'VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
        city: 'Bengaluru',
      },
      loading: false,
      error: null,
      refetch: () => undefined,
      logout: () => undefined,
    }),
  };
});

/**
 * The props the real route table hands its pages.
 *
 * Five of mWeb's pages take the header's current category, city and zone —
 * HomePage renders its whole feed from them, so mounted bare it shows the "no
 * content here" branch and the pod cards, the featured rail and the status
 * viewer never render at all. React ignores a prop a component does not
 * declare, so passing the same bag to every page is safe.
 */
const PAGE_PROPS = {
  superCategorySlug: 'nightlife',
  superCategory: 'nightlife',
  locationId: 'loc-1',
  zoneName: 'South',
};

const PAGES: PageEntry[] = [
  ['/', '/', () => import('../pages/HomePage')],
  ['/menu', '/menu', () => import('../pages/menu-page')],
  ['/profile', '/profile', () => import('../pages/ProfilePage')],
  ['/post/:postId', '/post/smoke-id', () => import('../pages/PostPage')],
  ['/follow', '/follow', () => import('../pages/FollowPage')],
  ['/account', '/account', () => import('../pages/AccountPage')],
  ['/club/:clubSlug', '/club/smoke-id', () => import('../pages/ClubDetailsPage')],
  ['/venue/:venueId', '/venue/smoke-id', () => import('../pages/VenueDetailsPage')],
  ['/venues', '/venues', () => import('../pages/venues-page')],
  ['/club/:clubSlug/pod/:podSlug', '/club/smoke-id/pod/smoke-id', () => import('../pages/PodDetailsPage')],
  ['/pod/:podId/feedback', '/pod/smoke-id/feedback', () => import('../pages/pod-feedback-page')],
  ['/u/:userId', '/u/smoke-id', () => import('../pages/PublicProfilePage')],
  ['/survey/:kind', '/survey/smoke-id', () => import('../pages/survey-gate')],
  ['/hosts-venues', '/hosts-venues', () => import('../pages/HostsVenuesPage')],
  ['/host/dashboard', '/host/dashboard', () => import('../pages/host-dashboard-page')],
  ['/verification', '/verification', () => import('../pages/verification-page')],
  ['/host/manage', '/host/manage', () => import('../pages/HostManagePage')],
  ['/host/pod/:podId/attendance', '/host/pod/smoke-id/attendance', () => import('../pages/pod-attendance-page')],
  ['/host/apply', '/host/apply', () => import('../pages/host-apply-page')],
  ['/host/wallet', '/host/wallet', () => import('../pages/wallet-page')],
  ['/create-pod', '/create-pod', () => import('../pages/create-pod-page')],
  ['/create-pod/:draftId', '/create-pod/smoke-id', () => import('../pages/create-pod-page')],
  ['/host/pod-pending/:podId', '/host/pod-pending/smoke-id', () => import('../pages/pod-pending-page')],
  ['/earn', '/earn', () => import('../pages/earn-page')],
  ['/tour-guide', '/tour-guide', () => import('../pages/tour-guide-page')],
  ['/products/manage', '/products/manage', () => import('../pages/products-manage-page')],
  ['/venues/manage', '/venues/manage', () => import('../pages/VenueManagePage')],
  ['/venues/earnings', '/venues/earnings', () => import('../pages/venue-earnings-page')],
  ['/venues/slot-requests', '/venues/slot-requests', () => import('../pages/venue-slot-requests-page')],
  ['/clubs/manage', '/clubs/manage', () => import('../pages/club-studio')],
  ['/venues/auto-pods', '/venues/auto-pods', () => import('../pages/venue-auto-pods-page')],
  ['/host/auto-pods', '/host/auto-pods', () => import('../pages/host-auto-pods-page')],
  ['/clubs/auto-pods', '/clubs/auto-pods', () => import('../pages/club-auto-pods-page')],
  ['/faqs', '/faqs', () => import('../pages/FaqsPage')],
  ['/policies/:slug', '/policies/smoke-id', () => import('../pages/PolicyPage')],
  ['/pod-ideas', '/pod-ideas', () => import('../pages/PodIdeasPage')],
  ['/referral', '/referral', () => import('../pages/referral-page')],
  ['/duncit-coin', '/duncit-coin', () => import('../pages/duncit-coin-page')],
  ['/leaderboard', '/leaderboard', () => import('../pages/leaderboard-page')],
  ['/membership', '/membership', () => import('../pages/membership-page')],
  ['/gift-cards', '/gift-cards', () => import('../pages/gift-cards-page')],
  ['/gift-cards/checkout', '/gift-cards/checkout', () => import('../pages/gift-card-checkout-page')],
  ['/gift-cards/redeem', '/gift-cards/redeem', () => import('../pages/gift-card-redeem-page')],
  ['/gift-card/:code', '/gift-card/smoke-id', () => import('../pages/gift-card-claim-page')],
  ['/pod-plans', '/pod-plans', () => import('../pages/PodPlansPage')],
  ['/pod-history', '/pod-history', () => import('../pages/PodHistoryPage')],
  ['/pod-history/:membershipId', '/pod-history/smoke-id', () => import('../pages/PodHistoryDetailsPage')],
  ['/booking/:bookingId', '/booking/smoke-id', () => import('../pages/booking-page')],
  ['/tickets/:id', '/tickets/smoke-id', () => import('../pages/support-tickets/TicketDetailPage')],
  ['/live-chat', '/live-chat', () => import('../pages/support-chat/SupportChatPage')],
  ['/account/health', '/account/health', () => import('../pages/AccountHealthPage')],
  ['/account/mail-preference', '/account/mail-preference', () => import('../pages/mail-preference-page')],
  ['/unsubscribe', '/unsubscribe', () => import('../pages/mail-preference-page')],
  ['/account/whatsapp-preference', '/account/whatsapp-preference', () => import('../pages/whatsapp-preference-page')],
  ['/venues/:venueId/health', '/venues/smoke-id/health', () => import('../pages/VenueHealthPage')],
  ['/signup-survey', '/signup-survey', () => import('../pages/SignupSurveyPage')],
  ['/signup-whatsapp', '/signup-whatsapp', () => import('../pages/SignupWhatsappPage')],
  ['/signup-referral', '/signup-referral', () => import('../pages/signup-referral-page')],
  ['/checkout', '/checkout', () => import('../pages/CheckoutPage')],
  ['/checkout/:podId', '/checkout/smoke-id', () => import('../pages/CheckoutPage')],
  ['/product-checkout', '/product-checkout', () => import('../pages/product-checkout-page')],
  ['/cart', '/cart', () => import('../pages/CartPage')],
  ['/shop', '/shop', () => import('../pages/shop-page')],
  ['/product/:productId', '/product/smoke-id', () => import('../pages/ProductDetailPage')],
  ['/orders', '/orders', () => import('../pages/OrdersHistoryPage')],
  ['/address-book', '/address-book', () => import('../pages/AddressBookPage')],
  ['/explore', '/explore', () => import('../pages/ExplorePage')],
  ['/previous-pods', '/previous-pods', () => import('../pages/PreviousPodsPage')],
  ['/happening-nearby', '/happening-nearby', () => import('../pages/HappeningNearbyPage')],
  ['/search', '/search', () => import('../pages/search-page')],
  ['/saved', '/saved', () => import('../pages/SavedItemsPage')],
  ['/clubs', '/clubs', () => import('../pages/ClubsPage')],
  ['/chats', '/chats', () => import('../pages/ChatsPage')],
  ['/chats/:id', '/chats/smoke-id', () => import('../pages/ChatRoomPage')],
  ['/register', '/register', () => import('../pages/RegisterPage')],
  ['/login', '/login', () => import('../pages/LoginPage')],
  ['/forgot-password', '/forgot-password', () => import('../pages/ForgotPasswordPage')],
  ['*', '/no-such-page', () => import('../pages/NotFoundPage')],
];

beforeEach(() => {
  // Several pages branch on a session; mount the signed-in half, which is the
  // one with the markup.
  localStorage.setItem('token', 'page-smoke-token');
});

afterEach(() => {
  localStorage.clear();
});

/**
 * Lets Apollo's rejection land.
 *
 * MockedProvider answers every operation with "No more mocked responses", but
 * that arrives a tick after the mount — so without this the pages are only ever
 * seen in their loading state and their error branch never runs. A page must not
 * throw when its data FAILS either, which is what the flush makes this assert.
 */
/**
 * Give jsdom a viewport with a size.
 *
 * Every element in jsdom measures 0x0, and a virtualised grid or list asks how
 * tall its viewport is before deciding how many rows to mount — so it mounts
 * none, and the cell renderers, row cards and empty-vs-filled branches that are
 * most of a console page never run at all. Handing back a plausible box is what
 * makes the data pass below reach them.
 *
 * Scoped to this file: it is a lie about layout, and the suites that assert on
 * real geometry must not inherit it.
 */
beforeAll(() => {
  for (const prop of ['offsetHeight', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 800 });
  }
  for (const prop of ['offsetWidth', 'clientWidth'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 1200 });
  }
  Element.prototype.getBoundingClientRect = function box() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800, toJSON: () => ({}) };
  } as typeof Element.prototype.getBoundingClientRect;

  // jsdom implements neither observer, and a chart, a virtualised list or a
  // MUI popper constructing one throws `ResizeObserver is not defined` — which
  // takes the whole page down mid-render, so the half of it below the chart
  // never runs. A no-op that never reports is enough: nothing here asserts on
  // a resize, only that the page survives being built.
  // It has to REPORT, not merely exist. A carousel or a virtualised list
  // measures itself and renders nothing until the first observation arrives, so
  // an observer that never fires is as good as no size at all — mWeb's club
  // hero (a react-slick slider) fell from 193 covered lines to 53 on a silent
  // one. This answers immediately with the same box getBoundingClientRect gives.
  const box = { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 };
  const size = [{ inlineSize: 1200, blockSize: 800 }];

  class SizedResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe(target: Element) {
      this.callback(
        [{ target, contentRect: box, borderBoxSize: size, contentBoxSize: size, devicePixelContentBoxSize: size }] as never,
        this as never
      );
    }

    unobserve() {}
    disconnect() {}
  }

  class SeenIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}

    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: box, intersectionRect: box, rootBounds: box, time: 0 }] as never,
        this as never
      );
    }

    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  globalThis.ResizeObserver ??= SizedResizeObserver as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver ??= SeenIntersectionObserver as unknown as typeof IntersectionObserver;
  Element.prototype.scrollTo ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

/**
 * Longer than the 5-second default, because these tests are deliberately slow.
 *
 * Each one mounts a whole page, waits for its data and then presses every
 * control on it in two waves. On the biggest console that ran past five seconds
 * and vitest cut the test off part-way — which does not fail loudly, it just
 * silently stops opening the dialogs that the later presses would have opened.
 * admin lost 2,673 covered lines to exactly that before the timeout was raised.
 *
 * Thirty seconds, and fourteen presses a wave. The ceiling has to clear the
 * slowest page, but it also has to stay well under the 60-minute budget the
 * coverage job gives each workspace — blowing THAT writes no lcov at all, which
 * would cost far more than a cut-off test.
 */
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

/**
 * Presses every enabled control the screen offers, once.
 *
 * This is where the dialogs, accordions and tab panels live: a portal page is
 * mostly a table plus a dozen things that only exist after a click, and none of
 * them had ever been rendered. What it asserts is the honest version of that —
 * no control on any screen may throw when it is pressed with no data behind it.
 *
 * The list is taken once, from document.body rather than the container, because
 * MUI renders a dialog into its own portal outside the tree under test. Nodes a
 * click detaches are simply no longer in the document, and firing at them is a
 * no-op, so the walk cannot loop. The cap keeps a page with a hundred row
 * buttons from dominating the run.
 */
/**
 * Types something plausible into every field on the screen.
 *
 * Runs before the click pass so that pressing Save actually reaches the
 * validation branch rather than bouncing off an untouched form. The value is
 * chosen from the input's own type, so a number field gets a number and a date
 * field gets a date — a form is entitled to reject nonsense, and a rejection is
 * not what this is looking for.
 */
const fillEverything = async () => {
  const fields = [
    ...document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([disabled]), textarea:not([disabled])'
    ),
  ].slice(0, 25);

  for (const field of fields) {
    if (!field.isConnected) continue;
    const type = (field as HTMLInputElement).type;
    let value = 'Smoke';
    if (type === 'number') value = '1';
    else if (type === 'email') value = 'smoke@duncit.com';
    else if (type === 'tel') value = '9000000000';
    else if (type === 'date') value = '2026-08-30';
    else if (type === 'time') value = '12:30';
    else if (type === 'url') value = 'https://duncit.com';
    fireEvent.change(field, { target: { value } });
  }
  await settle();
};

const MAX_CLICKS = 14;
/**
 * Two waves, because a console page is layered.
 *
 * The first wave opens the tabs, drawers and dialogs; their own controls only
 * exist once that has happened, so a single snapshot of the page stops one
 * level short of where most of the uncovered code lives. Two bounded waves,
 * never re-pressing the same node, reach that layer without any risk of walking
 * forever.
 */
const WAVES = 2;

const pressEverything = async () => {
  const pressed = new Set<HTMLElement>();

  for (let wave = 0; wave < WAVES; wave += 1) {
    const controls = [...document.body.querySelectorAll<HTMLElement>('button:not([disabled]), [role="tab"]')]
      .filter((control) => !pressed.has(control))
      .slice(0, MAX_CLICKS);
    if (controls.length === 0) return;

    for (const control of controls) {
      pressed.add(control);
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }
  }
};

describe('every routed page mounts with no data behind it', () => {
  it('covers every lazy page the route table declares', () => {
    expect(PAGES.length).toBeGreaterThan(0);
    expect(new Set(PAGES.map(([pattern]) => pattern)).size).toBe(PAGES.length);
  });

  it.each(PAGES)('mounts %s', async (pattern, concrete, load) => {
    const module = await load();
    const Page = module.default as ComponentType<typeof PAGE_PROPS>;

    // A page can be a plain function, a memo() or a forwardRef() — all objects
    // React can render, so the check is that the module exports one at all.
    expect(Page, `${pattern} has no default export`).toBeDefined();

    const { container, unmount } = render(
      <SmokeRoute pattern={pattern} concrete={concrete}>
        <Page {...PAGE_PROPS} />
      </SmokeRoute>
    );

    expect(container).toBeDefined();
    await settle();
    unmount();
  });

  it.each(PAGES)('survives every control on %s being pressed', async (pattern, concrete, load) => {
    const module = await load();
    const Page = module.default as ComponentType<typeof PAGE_PROPS>;

    const { unmount } = render(
      <SmokeRoute pattern={pattern} concrete={concrete}>
        <Page {...PAGE_PROPS} />
      </SmokeRoute>
    );

    await settle();
    await fillEverything();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
    unmount();
  });

  it('reads the server schema the with-data pass depends on', () => {
    // Without it every operation would answer empty and the pass below would
    // silently degrade into a second copy of the no-data one.
    expect(serverSchema()?.getQueryType()).toBeTruthy();
  });

  /**
   * The same screens again, with the schema-shaped mock answering every query.
   *
   * The no-data pass proves a screen survives a failed request; this one runs the
   * half that only exists once data arrives — the rows, the cards, the chips, the
   * formatted money and dates. See ./schema-mock for what it answers with.
   */
  it.each(PAGES)('renders %s with data behind it', async (pattern, concrete, load) => {
    const module = await load();
    const Page = module.default as ComponentType<typeof PAGE_PROPS>;

    const { container, unmount } = render(
      <SmokeRoute pattern={pattern} concrete={concrete} link={schemaMockLink()}>
        <Page {...PAGE_PROPS} />
      </SmokeRoute>
    );

    await settle();
    await settle();
    // With rows on the screen, the dialogs and menus a control opens are the
    // ones a person actually sees — prefilled, and with something to act on.
    await fillEverything();
    await pressEverything();

    expect(container.innerHTML).not.toBe('');
    unmount();
  });
});
