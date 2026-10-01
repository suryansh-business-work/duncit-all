import { createApolloClient } from '@duncit/shell';
import { appConfig } from './config/app-config';
import { urlConfigs } from './config/url-configs';
import { getToken } from './lib/session';

/** A value that belongs to the object holding it, and is never looked up on its own. */
const EMBEDDED = { keyFields: false } as const;

export const apolloClient = createApolloClient({
  graphqlUrl: urlConfigs.graphqlUrl,
  getToken,
  // Names this console for the platform rate limiter, so it can carry its
  // own ceiling instead of sharing one with the other sixteen.
  app: appConfig.key,
  typePolicies: {
    // The shell's default, restated because passing policies replaces it.
    User: { keyFields: ['user_id'] },
    // A reel's parts carry ids that are unique only INSIDE that reel — the
    // editor names scenes `s1`, `s2` in every reel it cuts. Left to the default,
    // the cache would file them all under `ReelScene:s1` and paint one reel
    // with another's footage. Embedded, they live and die with their project.
    // Both lists are replaced whole on every read. Saying so is what stops the
    // cache warning about lost data each time one gets shorter — footage
    // removed, or the transcript trimmed to its newest turns.
    ReelProject: { fields: { assets: { merge: false }, messages: { merge: false } } },
    ReelAsset: EMBEDDED,
    ReelMessage: EMBEDDED,
    ReelScene: EMBEDDED,
    ReelText: EMBEDDED,
    ReelOverlay: EMBEDDED,
  },
});
