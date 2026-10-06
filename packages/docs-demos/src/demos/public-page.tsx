import { PublicPageStatsPanel, PublishedLinkPanel } from '@duncit/public-page';
import {
  podSlugsFromPath,
  publicPagePosterFileName,
  publicPageQrFileName,
  publicPageTiles,
  type PublicPageInsights,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

// A 1×1 transparent PNG stands in for the QR the server draws.
const SAMPLE_QR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const INSIGHTS: PublicPageInsights = {
  published: true,
  link: { url: 'https://duncit.com/aB3dE9fK', code: 'aB3dE9fK', qr_data_url: SAMPLE_QR },
  stats: {
    total_clicks: 248,
    unique_visitors: 191,
    platforms: [
      { label: 'QR Code', count: 132 },
      { label: 'WhatsApp', count: 71 },
      { label: 'Instagram', count: 45 },
    ],
    cities: [
      { label: 'Bengaluru', count: 203 },
      { label: 'Mysuru', count: 12 },
    ],
  },
  funnel: {
    steps: [
      { step: 'CLICKED', count: 248 },
      { step: 'SIGNED_UP', count: 37 },
      { step: 'VIEWED_POD', count: 64 },
      { step: 'PAID', count: 19 },
    ],
    conversion_rate: 7.7,
  },
};

interface PanelMock {
  title: string;
  insights: PublicPageInsights;
}

interface PathMock {
  title: string;
  redirect: string;
}

export default defineDemos('public-page', [
  defineDemo<PanelMock>({
    id: 'published',
    title: 'A published venue page: its link, QR, poster and numbers',
    note:
      'Edit the funnel counts and the tiles follow. The copy, QR and poster buttons do nothing here — in a studio they hit the API.',
    mock: { title: 'The Courtyard, Indiranagar', insights: INSIGHTS },
    render: (mock) => (
      <>
        {mock.insights.link && (
          <PublishedLinkPanel
            link={mock.insights.link}
            title={mock.title}
            posterLoading={false}
            onCopy={() => undefined}
            onDownloadQr={() => undefined}
            onDownloadPoster={() => undefined}
          />
        )}
        <PublicPageStatsPanel insights={mock.insights} days={30} onDaysChange={() => undefined} />
      </>
    ),
  }),
  defineDemo<PathMock>({
    id: 'contract',
    title: 'The framework-free half every surface shares',
    note:
      'Change the redirect to a club page and the sign-in screens stop showing a pod. The file names are what the browser and the app both save.',
    mock: { title: 'The Courtyard, Indiranagar', redirect: '/club/bengaluru-runners/pod/sunday-5k' },
    compute: (mock) => ({
      'Pod shown on the sign-in screens': podSlugsFromPath(mock.redirect),
      'Poster file': publicPagePosterFileName(mock.title),
      'QR file': publicPageQrFileName(mock.title),
      Tiles: publicPageTiles(INSIGHTS),
    }),
  }),
]);
