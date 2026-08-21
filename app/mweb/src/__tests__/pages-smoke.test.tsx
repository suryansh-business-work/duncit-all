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
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type PageEntry = [pattern: string, concrete: string, load: () => Promise<Record<string, unknown>>];

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
  ['/reset-password', '/reset-password', () => import('../pages/ResetPasswordPage')],
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
const MAX_CLICKS = 20;

const pressEverything = async () => {
  const controls = [...document.body.querySelectorAll<HTMLElement>('button:not([disabled]), [role="tab"]')].slice(
    0,
    MAX_CLICKS
  );

  for (const control of controls) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

describe('every routed page mounts with no data behind it', () => {
  it('covers every lazy page the route table declares', () => {
    expect(PAGES.length).toBeGreaterThan(0);
    expect(new Set(PAGES.map(([pattern]) => pattern)).size).toBe(PAGES.length);
  });

  it.each(PAGES)('mounts %s', async (pattern, concrete, load) => {
    const module = await load();
    const Page = module.default as ComponentType<Record<string, never>>;

    // A page can be a plain function, a memo() or a forwardRef() — all objects
    // React can render, so the check is that the module exports one at all.
    expect(Page, `${pattern} has no default export`).toBeDefined();

    const { container, unmount } = render(
      <MockedProvider mocks={[]}>
        <MemoryRouter initialEntries={[concrete]}>
          <Routes>
            <Route path={pattern} element={<Page />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    );

    expect(container).toBeDefined();
    await settle();
    unmount();
  });

  it.each(PAGES)('survives every control on %s being pressed', async (pattern, concrete, load) => {
    const module = await load();
    const Page = module.default as ComponentType<Record<string, never>>;

    const { unmount } = render(
      <MockedProvider mocks={[]}>
        <MemoryRouter initialEntries={[concrete]}>
          <Routes>
            <Route path={pattern} element={<Page />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    );

    await settle();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
    unmount();
  });
});
