import type { ReactElement } from 'react';
import ScreensPage from './screens/ScreensPage';
import ClickstreamPage from './clickstream/ClickstreamPage';
import FunnelsPage from './funnels/FunnelsPage';
import RetentionPage from './retention/RetentionPage';
import SessionsPage from './sessions/SessionsPage';
import UsersPage from './users/UsersPage';
import EventsPage from './events/EventsPage';

/** Analytics > Product's own pages. Its Overview is a dashboard, routed with the others from pages.ts. */
export const PRODUCT_ROUTES: ReadonlyArray<{ path: string; element: ReactElement }> = [
  { path: '/product/screens', element: <ScreensPage /> },
  { path: '/product/clickstream', element: <ClickstreamPage /> },
  { path: '/product/funnels', element: <FunnelsPage /> },
  { path: '/product/retention', element: <RetentionPage /> },
  { path: '/product/sessions', element: <SessionsPage /> },
  { path: '/product/users', element: <UsersPage /> },
  { path: '/product/events', element: <EventsPage /> },
];
