import { MemoryRouter } from 'react-router-dom';
import { AppBreadcrumbs, BreadcrumbProvider, ID_CRUMB_LABEL } from '@duncit/breadcrumb';
import { defineDemo, defineDemos } from '../types';

interface CrumbMock {
  /** The URL the portal is on. */
  path: string;
  app_name: string;
  /** The portal's sidebar — the trail is read out of it, never declared twice. */
  nav: { label: string; to?: string; children?: { label: string; to: string }[] }[];
  /** Explicit labels for segments that are not in the nav. */
  label_map: Record<string, string>;
}

export default defineDemos('breadcrumb', [
  defineDemo<CrumbMock>({
    id: 'trail',
    title: 'The trail is the sidebar, read backwards from the URL',
    note:
      "Change path to /telemetry/logs/66f1c0a4e2b9a41d7c3f8a12 — the opaque id collapses to a friendly label instead of printing a Mongo id at a user. Add an entry to label_map to name a segment the nav has never heard of.",
    mock: {
      path: '/telemetry/logs/66f1c0a4e2b9a41d7c3f8a12',
      app_name: 'Duncit Tech',
      nav: [
        { label: 'Dashboard', to: '/' },
        {
          label: 'Telemetry',
          children: [
            { label: 'Dashboard', to: '/telemetry' },
            { label: 'Logs', to: '/telemetry/logs' },
          ],
        },
      ],
      label_map: {},
    },
    render: (mock) => (
      <MemoryRouter initialEntries={[mock.path]}>
        <BreadcrumbProvider>
          <AppBreadcrumbs nav={mock.nav} appName={mock.app_name} labelMap={mock.label_map} />
        </BreadcrumbProvider>
      </MemoryRouter>
    ),
    compute: (mock) => ({
      'Path': mock.path,
      'Segments': mock.path.split('/').filter(Boolean),
      'What an opaque id becomes': ID_CRUMB_LABEL,
      'On / and /login': 'nothing renders — a breadcrumb to where you already are is noise.',
    }),
  }),
]);
