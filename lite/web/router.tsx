import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from './layout/AppShell';

/** Route-level code splitting: each page's code loads the first time it is visited. */
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await load())[name] as ComponentType }));

const DiscoverPage = page(() => import('./pages/discover'), 'DiscoverPage');
const CityPage = page(() => import('./pages/lists'), 'CityPage');
const CategoryPage = page(() => import('./pages/lists'), 'CategoryPage');
const SearchPage = page(() => import('./pages/lists'), 'SearchPage');
const EventPage = page(() => import('./pages/event'), 'EventPage');
const CreateEventPage = page(() => import('./pages/event-form'), 'CreateEventPage');
const EditEventPage = page(() => import('./pages/event-form'), 'EditEventPage');
const ManagePage = page(() => import('./pages/manage'), 'ManagePage');
const TicketsPage = page(() => import('./pages/tickets'), 'TicketsPage');
const TicketPage = page(() => import('./pages/ticket'), 'TicketPage');
const HostingPage = page(() => import('./pages/hosting'), 'HostingPage');
const CalendarsPage = page(() => import('./pages/calendars'), 'CalendarsPage');
const CalendarFormPage = page(() => import('./pages/calendars'), 'CalendarFormPage');
const CalendarPage = page(() => import('./pages/calendar'), 'CalendarPage');
const UserPage = page(() => import('./pages/user'), 'UserPage');
const ProfilePage = page(() => import('./pages/profile'), 'ProfilePage');
const SignInPage = page(() => import('./pages/signin'), 'SignInPage');
const NotFoundPage = page(() => import('./pages/not-found'), 'NotFoundPage');

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DiscoverPage /> },
      { path: '/discover', element: <DiscoverPage /> },
      { path: '/category/:slug', element: <CategoryPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/e/:slug', element: <EventPage /> },
      { path: '/e/:slug/edit', element: <EditEventPage /> },
      { path: '/e/:slug/manage', element: <ManagePage /> },
      { path: '/create', element: <CreateEventPage /> },
      { path: '/tickets', element: <TicketsPage /> },
      { path: '/tickets/:id', element: <TicketPage /> },
      { path: '/hosting', element: <HostingPage /> },
      { path: '/calendars', element: <CalendarsPage /> },
      { path: '/calendars/new', element: <CalendarFormPage /> },
      { path: '/calendars/:id/edit', element: <CalendarFormPage /> },
      { path: '/cal/:slug', element: <CalendarPage /> },
      { path: '/u/:handle', element: <UserPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/404', element: <NotFoundPage /> },
      // Registered LAST so a city slug never shadows a fixed route.
      { path: '/:citySlug', element: <CityPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
