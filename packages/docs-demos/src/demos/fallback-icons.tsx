import { FALLBACK_ICON_NAMES, resolveIconSource, toFallbackIconName } from '@duncit/fallback-icons';
import { defineDemo, defineDemos } from '../types';

interface IconMock {
  /** What Admin > Branding has for this slot. Blank it to see the rule bite. */
  admin_url: string;
  /** Set by the <img onError> handler when the URL 404s at request time. */
  failed: boolean;
  candidate_name: string;
}

/** Stands in for the bundled asset a project imports. */
const BUNDLED = '/src/fallback-icons/logo.png';

export default defineDemos('fallback-icons', [
  defineDemo<IconMock>({
    id: 'resolve',
    title: 'What actually renders in an icon slot',
    note:
      'Blank admin_url OR set failed to true — both fall back. The second is the one that matters: a URL that 404s never arrives empty, so a blank-check alone renders a broken image.',
    mock: {
      admin_url: 'https://ik.imagekit.io/duncit/branding/logo.png',
      failed: false,
      candidate_name: 'all-vibe',
    },
    compute: (mock) => {
      const resolved = resolveIconSource(mock.admin_url, BUNDLED, mock.failed);
      return {
        'Renders': resolved.source,
        'Using the bundled copy': resolved.isFallback,
        'toFallbackIconName(candidate_name)': toFallbackIconName(mock.candidate_name),
        'Every name a project must ship': FALLBACK_ICON_NAMES,
      };
    },
  }),
]);
