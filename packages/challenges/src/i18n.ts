import { createBundleTranslation, CHALLENGE_BUNDLE } from '@duncit/app-settings';

/**
 * Translate inside the shared challenge editors. The `challenge.*` bundle is
 * layered over the host surface's, so Admin > Categories (whose provider only
 * knows `admin.*`) still resolves the mapping editor's copy, while a server
 * translation of any key wins wherever one exists.
 */
export const useTranslation = createBundleTranslation(CHALLENGE_BUNDLE);

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];
