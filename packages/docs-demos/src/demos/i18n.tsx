import {
  MWEB_BUNDLE,
  flattenCatalogue,
  mergeCatalogues,
  missingKeys,
  nestCatalogue,
} from '@duncit/i18n';
import { defineDemo, defineDemos } from '../types';

interface CatalogueMock {
  /** What the server sent for this locale — deliberately incomplete. */
  server: Record<string, string>;
  /** Keys the screen renders, to check the fallback bundle covers them. */
  rendered: string[];
}

export default defineDemos('i18n', [
  defineDemo<CatalogueMock>({
    id: 'merge',
    title: 'Server copy over the shipped fallback',
    note:
      'Delete a key from server and the shipped English wins for that one line only — which is why a screen still reads correctly offline and before the API answers.',
    mock: {
      server: {
        'mweb.giftCards.title': 'उपहार कार्ड',
        'mweb.giftCards.flipCard': 'कार्ड पलटें',
      },
      rendered: ['mweb.giftCards.title', 'mweb.giftCards.flipCard', 'mweb.giftCards.buyTab'],
    },
    compute: (mock) => {
      const fallback = flattenCatalogue(MWEB_BUNDLE as never);
      const merged = mergeCatalogues(fallback, mock.server);
      const shown = Object.fromEntries(mock.rendered.map((key) => [key, merged[key] ?? `‹${key}›`]));
      return {
        'Keys in the shipped bundle': Object.keys(fallback).length,
        'Keys the server translated': Object.keys(mock.server).length,
        'What each rendered key resolves to': shown,
        'Rendered keys with no fallback': missingKeys(
          Object.fromEntries(mock.rendered.map((key) => [key, ''])),
          fallback
        ),
      };
    },
  }),

  defineDemo<{ flat: Record<string, string> }>({
    id: 'shape',
    title: 'Flat keys and the nested tree are the same thing',
    note:
      'Admin > Localization stores flat keys; the bundles are written nested. These two turn one into the other losslessly.',
    mock: {
      flat: {
        'mweb.giftCards.title': 'Gift Cards',
        'mweb.giftCards.flipCard': 'Flip card',
        'mweb.common.goBack': 'Go back',
      },
    },
    compute: (mock) => ({
      'nestCatalogue(flat)': nestCatalogue(mock.flat),
      'flattenCatalogue(that)': flattenCatalogue(nestCatalogue(mock.flat)),
    }),
  }),
]);
