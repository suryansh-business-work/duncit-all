import { lazy, type ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { AppShell, type RouteHandle } from './layout/AppShell';
import { HomeGate } from './pages/landing/HomeGate';

/** Route-level code splitting: each page's code loads the first time it is visited. */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await load())[name] as ComponentType }));

const EventsHomePage = page(() => import('./pages/home'), 'EventsHomePage');
const DiscoverPage = page(() => import('./pages/discover'), 'DiscoverPage');
const PricingPage = page(() => import('./pages/pricing'), 'PricingPage');
const CityPage = page(() => import('./pages/lists'), 'CityPage');
const CategoryPage = page(() => import('./pages/lists'), 'CategoryPage');
const SearchPage = page(() => import('./pages/lists'), 'SearchPage');
const EventPage = page(() => import('./pages/event'), 'EventPage');
const CreateEventPage = page(() => import('./pages/event-form'), 'CreateEventPage');
const EditEventPage = page(() => import('./pages/event-form'), 'EditEventPage');
const ManagePage = page(() => import('./pages/manage'), 'ManagePage');
const ScanPage = page(() => import('./pages/scan'), 'ScanPage');
const TicketsPage = page(() => import('./pages/tickets'), 'TicketsPage');
const TicketPage = page(() => import('./pages/ticket'), 'TicketPage');
const CalendarsPage = page(() => import('./pages/calendars'), 'CalendarsPage');
const CalendarFormPage = page(() => import('./pages/calendars'), 'CalendarFormPage');
const CalendarPage = page(() => import('./pages/calendar'), 'CalendarPage');
const UserPage = page(() => import('./pages/user'), 'UserPage');
const SettingsPage = page(() => import('./pages/settings'), 'SettingsPage');
const SignInPage = page(() => import('./pages/signin'), 'SignInPage');
const NotFoundPage = page(() => import('./pages/not-found'), 'NotFoundPage');

/** The id the server render reads to answer 404. */
export const NOT_FOUND_ROUTE_ID = 'not-found';

/**
 * Every page of lite.duncit.com. The browser router and the server render
 * both build from this one table, so a server-rendered page is exactly the
 * page the browser then takes over.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      // Signed out: the landing page. Signed in: your events, as at /home.
      { path: '/', element: <HomeGate />, handle: { bleed: true } satisfies RouteHandle },
      { path: '/home', element: <EventsHomePage /> },
      { path: '/hosting', element: <EventsHomePage /> },
      { path: '/discover', element: <DiscoverPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/category/:slug', element: <CategoryPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/e/:slug', element: <EventPage /> },
      { path: '/e/:slug/edit', element: <EditEventPage /> },
      { path: '/e/:slug/manage', element: <ManagePage /> },
      { path: '/e/:slug/scan', element: <ScanPage /> },
      { path: '/create', element: <CreateEventPage /> },
      { path: '/tickets', element: <TicketsPage /> },
      { path: '/tickets/:id', element: <TicketPage /> },
      { path: '/calendars', element: <CalendarsPage /> },
      { path: '/calendars/new', element: <CalendarFormPage /> },
      { path: '/calendars/:id/edit', element: <CalendarFormPage /> },
      { path: '/cal/:slug', element: <CalendarPage /> },
      { path: '/u/:handle', element: <UserPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/profile', element: <SettingsPage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/404', id: NOT_FOUND_ROUTE_ID, element: <NotFoundPage /> },
      // Registered LAST so a city slug never shadows a fixed route.
      { path: '/:citySlug', element: <CityPage /> },
      { path: '*', id: `${NOT_FOUND_ROUTE_ID}-any`, element: <NotFoundPage /> },
    ],
  },
];
