import { PRODUCT_VISIBILITY_FLAG, pageTitle } from '@duncit/app-settings';
import { defineDemo, defineDemos } from '../types';

interface TitleMock {
  app_name: string;
  page_titles: string[];
}

interface FlagMock {
  publicFeatureFlags: { key: string; enabled: boolean }[];
  loading: boolean;
}

/** What `useProductVisibility()` answers, without the Apollo round trip: the
 * hook is exactly this derivation over the `publicFeatureFlags` payload. */
const productVisibility = (mock: FlagMock) => {
  const flag = mock.publicFeatureFlags.find((f) => f.key === PRODUCT_VISIBILITY_FLAG);
  const pending = mock.loading && mock.publicFeatureFlags.length === 0;
  return { pending, visible: !pending && flag?.enabled === true };
};

/** What `useFeatureFlagState(key)` answers for any flag: the same derivation,
 * with `pending` telling a route gate to wait rather than redirect. */
const flagState = (mock: FlagMock, key: string) => {
  const pending = mock.loading && mock.publicFeatureFlags.length === 0;
  const flag = mock.publicFeatureFlags.find((f) => f.key === key);
  return { pending, enabled: !pending && flag?.enabled === true };
};

export default defineDemos('app-settings', [
  defineDemo<TitleMock>({
    id: 'page-title',
    title: 'What the browser tab says on every page',
    note:
      "Set a page title equal to app_name and it is NOT repeated — 'Duncit Tech | Duncit Tech' is the bug this one rule exists to stop.",
    mock: {
      app_name: 'Duncit Tech',
      page_titles: ['Package Documentation', 'Telemetry Logs', 'Duncit Tech', 'Email Templates'],
    },
    compute: (mock) =>
      Object.fromEntries(
        mock.page_titles.map((title) => [title, pageTitle(title, mock.app_name)])
      ),
  }),
  defineDemo<FlagMock>({
    id: 'product-visibility',
    title: 'The product kill switch, and why a route gate waits',
    note:
      "Flip is_product_visible to true and every product surface returns. Empty the flag list to see the loading beat: visible is already false (nothing flashes on), but pending says a route gate must WAIT rather than redirect a bookmarked /shop link home. The last line is useFeatureFlagState('auto_pods') — the same two-part answer for any flag, which is what keeps a reload of Admin > Auto Pods on Auto Pods.",
    mock: {
      loading: true,
      publicFeatureFlags: [
        { key: PRODUCT_VISIBILITY_FLAG, enabled: false },
        { key: 'auto_pods', enabled: false },
        { key: 'gift_cards', enabled: false },
      ],
    },
    compute: (mock) => {
      const { pending, visible } = productVisibility(mock);
      const autoPods = flagState(mock, 'auto_pods');
      let autoPodsGate = autoPods.enabled ? 'render Auto Pods' : 'redirect to /pods';
      if (autoPods.pending) autoPodsGate = 'wait — the flags have not landed';
      return {
        [PRODUCT_VISIBILITY_FLAG]: visible,
        'header cart icon': visible ? 'shown' : 'hidden',
        'Pod Shop on a pod': visible ? 'shown' : 'hidden',
        '/shop, /cart, /orders': visible ? 'render' : 'redirect to /',
        'route gate verdict': pending ? 'wait — the flags have not landed' : 'decide now',
        "useFeatureFlagState('auto_pods')": autoPods,
        '/auto-pods on reload': autoPodsGate,
      };
    },
  }),
]);
