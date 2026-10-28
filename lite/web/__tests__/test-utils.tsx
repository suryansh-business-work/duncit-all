/**
 * What every rendered web-app test shares: the providers App.tsx mounts
 * (Apollo, the Lite theme, settings, session, confirm dialogs, the sign-in
 * prompt and a router), fixture factories shaped like the API's answers, and
 * a listener for the toasts `notifySuccess` / `notifyError` raise.
 *
 * The settings, the admin's date formats and (when signed in) the account are
 * written into the Apollo cache before the first render, so a page renders
 * its real content at once instead of a spinner.
 */
import type { ReactElement, ReactNode } from 'react';
import { InMemoryCache } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider } from '@mui/material/styles';
import { act, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { ConfirmProvider } from '@duncit/dialogs';
import { STORAGE_KEYS } from '../../shared/env';
import {
  LITE_ME,
  LITE_SETTINGS,
  type LiteCalendar,
  type LiteCategory,
  type LiteCity,
  type LiteEvent,
  type LiteEventCard,
  type LiteEventStats,
  type LiteHost,
  type LiteMe,
  type LitePublicSettings,
  type LiteQuestion,
  type LiteRegistration,
  type LiteTicketType,
} from '../../shared/graphql/documents';
import { LiteSessionProvider } from '../../shared/session';
import { MODE_STORAGE_KEY, buildLiteTheme } from '../../shared/theme';
import { LiteSettingsProvider } from '../app/providers/LiteSettingsProvider';
import { SignInPromptProvider } from '../app/providers/SignInPromptProvider';

/** The value with the GraphQL `__typename` Apollo's cache matches fragments on. */
export const typed = <T extends object>(typename: string, value: T): T & { __typename: string } => Object.assign({ __typename: typename }, value);

/** The token a signed-in render starts from. */
export const TEST_TOKEN = 'test-session-token';

// ---------------------------------------------------------------- fixtures ----

export const settingsFixture = (over: Partial<LitePublicSettings> = {}): LitePublicSettings =>
  typed('LitePublicSettings', {
    site_name: 'Duncit Lite',
    support_email: 'help@lite.example',
    default_timezone: 'Asia/Kolkata',
    currency: 'INR',
    google_client_id: '',
    sign_in_with_duncit: true,
    maps_api_key: '',
    maps_map_id: '',
    phone_sign_in: false,
    default_country_code: '91',
    max_ticket_price: 50_000,
    max_event_capacity: 5_000,
    max_seats_per_registration: 10,
    upi_help_text: '',
    duncit_app_url: 'https://duncit.example',
    ...over,
  });

export const meFixture = (over: Partial<LiteMe> = {}): LiteMe =>
  typed('LiteUser', {
    id: 'u-1',
    email: 'asha@example.com',
    phone: null,
    name: 'Asha Rao',
    handle: 'asha',
    avatar_url: null,
    bio: null,
    social: typed('LiteSocialLinks', { instagram: '', x: '', youtube: '', tiktok: '', linkedin: '', website: '' }),
    upi_id: null,
    upi_name: null,
    locale: null,
    display_mode: 'SYSTEM' as const,
    is_admin: false,
    is_blocked: false,
    duncit_linked: false,
    events_hosted: 0,
    events_attended: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  });

export const hostFixture = (over: Partial<LiteHost> = {}): LiteHost =>
  typed('LiteHost', { user_id: 'u-1', name: 'Asha Rao', handle: 'asha', avatar_url: null, role: 'HOST' as const, ...over });

export const ticketFixture = (over: Partial<LiteTicketType> = {}): LiteTicketType =>
  typed('LiteTicketType', { id: 'tk-1', name: 'General', description: null, price: 0, quantity: null, sold: 0, is_active: true, ...over });

export const statsFixture = (over: Partial<LiteEventStats> = {}): LiteEventStats =>
  typed('LiteEventStats', { going: 0, waitlisted: 0, pending: 0, payment_pending: 0, checked_in: 0, revenue_confirmed: 0, ...over });

export const categoryFixture = (over: Partial<LiteCategory> = {}): LiteCategory =>
  typed('LiteCategory', { id: 'cat-1', name: 'Music', slug: 'music', icon: null, sort_order: 0, is_active: true, events_count: 2, ...over });

export const cityFixture = (over: Partial<LiteCity> = {}): LiteCity =>
  typed('LiteCity', {
    id: 'city-1',
    name: 'Delhi',
    slug: 'delhi',
    country: 'India',
    region: 'ASIA_PACIFIC' as const,
    cover_url: null,
    featured: true,
    sort_order: 0,
    is_active: true,
    events_count: 3,
    ...over,
  });

export const questionFixture = (over: Partial<LiteQuestion> = {}): LiteQuestion =>
  typed('LiteQuestion', { id: 'q-1', label: 'Dietary needs', type: 'TEXT' as const, required: false, options: [], ...over });

/**
 * An event as a list shows it: Sat 21 Nov 2026, 7:00 PM – 9:30 PM in Delhi
 * (13:30–16:00 UTC), free, published and open.
 */
export const eventCardFixture = (over: Partial<LiteEventCard> = {}): LiteEventCard =>
  typed('LiteEvent', {
    id: 'ev-1',
    slug: 'garden-party',
    title: 'Garden Party',
    cover_url: null,
    start_at: '2026-11-21T13:30:00.000Z',
    end_at: '2026-11-21T16:00:00.000Z',
    timezone: 'Asia/Kolkata',
    location_type: 'IN_PERSON' as const,
    venue_name: 'Lodhi Garden',
    city_slug: 'delhi',
    city_name: 'Delhi',
    visibility: 'PUBLIC' as const,
    status: 'PUBLISHED' as const,
    featured: false,
    hidden: false,
    category: null,
    hosts: [hostFixture()],
    tickets: [ticketFixture()],
    stats: statsFixture(),
    viewer_is_host: false,
    registration_open: true,
    theme: typed('LiteEventTheme', { key: 'MINIMAL' as const, accent: 'DEFAULT' as const }),
    ...over,
  });

export const calendarFixture = (over: Partial<LiteCalendar> = {}): LiteCalendar =>
  typed('LiteCalendar', {
    id: 'cal-1',
    slug: 'run-club',
    name: 'Run Club',
    description: null,
    avatar_url: null,
    cover_url: null,
    city_slug: null,
    city_name: null,
    tint: 'DEFAULT',
    owner: typed('LiteCalendarOwner', { id: 'u-1', name: 'Asha Rao', handle: 'asha', avatar_url: null }),
    featured: false,
    subscriber_count: 0,
    upcoming_count: 0,
    viewer_subscribed: false,
    viewer_is_owner: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  });

/** The whole event page: the card plus everything the page and the form read. */
export const eventFixture = (over: Partial<LiteEvent> = {}): LiteEvent =>
  typed('LiteEvent', {
    ...eventCardFixture(),
    description: 'Bring a picnic blanket.',
    address: 'Lodhi Road, New Delhi',
    map_url: null,
    place_id: null,
    lat: null,
    lng: null,
    virtual_link: null,
    calendar: null,
    capacity: null,
    require_approval: false,
    questions: [],
    upi_id: null,
    upi_name: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    published_at: '2026-10-01T00:00:00.000Z',
    cancelled_at: null,
    cancel_reason: null,
    viewer_registration: null,
    ...over,
  });

export const registrationFixture = (over: Partial<LiteRegistration> = {}): LiteRegistration =>
  typed('LiteRegistration', {
    id: 'reg-1',
    code: 'ABC123',
    ticket: typed('LiteRegistrationTicket', { id: 'tk-1', name: 'General', price: 0 }),
    quantity: 1,
    amount_due: 0,
    status: 'CONFIRMED' as const,
    payment_status: 'NOT_REQUIRED' as const,
    payment_reference: null,
    payment_note: null,
    payment_confirmed_at: null,
    answers: [],
    checked_in_at: null,
    waitlist_position: null,
    user: typed('LiteRegistrationUser', { id: 'u-2', name: 'Ravi Kumar', email: 'ravi@example.com', phone: null, handle: 'ravi', avatar_url: null }),
    created_at: '2026-10-02T00:00:00.000Z',
    ...over,
  });

/** The admin's display settings: dd MMM yyyy, hh:mm a, Delhi, the browser's clock. */
export const APP_SETTINGS = {
  date_format: 'dd MMM yyyy',
  time_format: 'hh:mm a',
  time_zone: 'Asia/Kolkata',
  time_source: 'BROWSER',
  custom_time: null,
  custom_time_set_at: null,
  server_time: null,
  min_signup_age: 18,
  draft_retention_days: 30,
  ticket_discount_max_pct: 50,
  happening_nearby_days: 7,
};

// --------------------------------------------------------------- providers ----

export interface ProviderOptions {
  /** Apollo answers beyond the seeded settings and account. */
  mocks?: readonly MockedResponse[];
  /** The signed-in account; omitted or null renders signed out. */
  me?: LiteMe | null;
  /** Overrides on the public settings. */
  settings?: Partial<LitePublicSettings>;
}

/** A cache already holding the settings, the date formats and (signed in) the account. */
export function seedCache({ me = null, settings }: ProviderOptions = {}): InMemoryCache {
  const cache = new InMemoryCache();
  cache.writeQuery({ query: LITE_SETTINGS, data: { liteSettings: settingsFixture(settings) } });
  cache.writeQuery({ query: PUBLIC_APP_SETTINGS, data: { publicAppSettings: typed('PublicAppSettings', APP_SETTINGS) } });
  if (me) cache.writeQuery({ query: LITE_ME, data: { liteMe: me } });
  return cache;
}

/** The account's own read, answered every time the session asks (it reads cache-and-network). */
export const meMock = (me: LiteMe): MockedResponse => ({ request: { query: LITE_ME }, result: { data: { liteMe: me } }, maxUsageCount: Number.POSITIVE_INFINITY });

/**
 * What the providers read again after `client.resetStore()` (signing in or
 * out): the settings, the date formats and, when given, the new account.
 */
export const storeResetMocks = (me: LiteMe | null = null, settings: Partial<LitePublicSettings> = {}): MockedResponse[] => [
  { request: { query: LITE_SETTINGS }, result: { data: { liteSettings: settingsFixture(settings) } }, maxUsageCount: Number.POSITIVE_INFINITY },
  { request: { query: PUBLIC_APP_SETTINGS }, result: { data: { publicAppSettings: typed('PublicAppSettings', APP_SETTINGS) } }, maxUsageCount: Number.POSITIVE_INFINITY },
  ...(me ? [meMock(me)] : []),
];

interface TestProvidersProps extends ProviderOptions {
  cache: InMemoryCache;
  children: ReactNode;
}

/** App.tsx's provider stack, minus Google, the locale sync and the progress bar. */
export function TestProviders({ cache, mocks = [], me = null, children }: Readonly<TestProvidersProps>) {
  const all = me ? [meMock(me), ...mocks] : [...mocks];
  return (
    <MockedProvider mocks={all} cache={cache} mockLinkDefaultOptions={{ delay: 0 }}>
      <ThemeProvider theme={buildLiteTheme()} defaultMode="dark" modeStorageKey={MODE_STORAGE_KEY} disableTransitionOnChange>
        <LiteSettingsProvider>
          <LiteSessionProvider tokenKey={STORAGE_KEYS.token} initialToken={me ? TEST_TOKEN : null}>
            <ConfirmProvider>
              <SignInPromptProvider>{children}</SignInPromptProvider>
            </ConfirmProvider>
          </LiteSessionProvider>
        </LiteSettingsProvider>
      </ThemeProvider>
    </MockedProvider>
  );
}

export interface RenderOptions extends ProviderOptions {
  /** The URL the page opens at (default `/`). */
  route?: string;
  /** The route pattern the element is mounted at, for `useParams` (default: every path). */
  path?: string;
  /** Extra routes beside the page, e.g. a page a link leads to. */
  routes?: { path: string; element: ReactElement }[];
  /** Passed to `userEvent.setup` (fake timers need `advanceTimers`). */
  userOptions?: Parameters<typeof userEvent.setup>[0];
}

/** Render a page or component the way the app mounts it, inside a memory router. */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const { route = '/', path = '*', routes = [], userOptions } = options;
  const cache = seedCache(options);
  const router = createMemoryRouter([{ path, element: ui }, ...routes], { initialEntries: [route] });
  const user = userEvent.setup(userOptions);
  const utils = render(
    <TestProviders cache={cache} mocks={options.mocks} me={options.me}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { ...utils, router, cache, user };
}

/** A hook rendered inside the same providers, under a memory router at `route`. */
export function renderHookWithProviders<T>(hook: () => T, options: Omit<RenderOptions, 'path' | 'routes' | 'userOptions'> = {}) {
  const cache = seedCache(options);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders cache={cache} mocks={options.mocks} me={options.me}>
      <MemoryRouter initialEntries={[options.route ?? '/']}>{children}</MemoryRouter>
    </TestProviders>
  );
  return { ...renderHook(hook, { wrapper }), cache };
}

/** Lets mocked Apollo answers (delay 0) and the state they set land. */
export async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

// ----------------------------------------------------------- notifications ----

export interface Notification {
  message: string;
  severity: string;
}

/**
 * Every toast raised through @duncit/dialogs' `notify*` while the test runs.
 * They travel as a window event, so the listener sees exactly what a reader would.
 */
export function captureNotifications(): { seen: Notification[]; stop: () => void } {
  const seen: Notification[] = [];
  const listener = (event: Event) => {
    if (event instanceof CustomEvent) {
      const detail: Partial<Notification> = event.detail ?? {};
      seen.push({ message: String(detail.message ?? ''), severity: String(detail.severity ?? '') });
    }
  };
  globalThis.addEventListener('duncit:notify', listener);
  return { seen, stop: () => globalThis.removeEventListener('duncit:notify', listener) };
}
