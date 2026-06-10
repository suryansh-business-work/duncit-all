const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The mobile app is a standalone npm project, not a pnpm workspace member, so we
// only widen Metro's watch scope to the shared design-token package (linked via
// the `@duncit/auth-tokens` file: dependency). We deliberately do NOT add the
// monorepo root node_modules to resolution — that would mix pnpm's React copy
// with the app's and break the bundle.
config.watchFolders = [path.resolve(__dirname, '../../packages')];

// Expo SDK 54 enables package exports, so Metro prefers each package's ESM
// `import` condition. For a few deps that ESM build is unusable under Metro, so
// we pin them to their CommonJS build:
//   - graphql-request@6: its top-level `import crossFetch, * as CrossFetch from
//     'cross-fetch'` trips Metro's ESM↔CJS interop (cross-fetch is CJS, so
//     `_interopNamespace` throws "Cannot set property default … only a getter").
//   - socket.io-client / engine.io-client: their ESM builds use extensionless
//     relative imports Metro can't resolve, so Metro fails on `build/esm/index.js`.
//     (socket.io-parser / engine.io-parser / component-emitter have no `import`
//     export condition, so they already resolve to CJS via `main`.)
const cjsPins = {
  'graphql-request': 'node_modules/graphql-request/build/cjs/index.js',
  'socket.io-client': 'node_modules/socket.io-client/build/cjs/index.js',
  'engine.io-client': 'node_modules/engine.io-client/build/cjs/index.js',
};
const resolvedCjsPins = Object.fromEntries(
  Object.entries(cjsPins).map(([name, rel]) => [name, path.resolve(__dirname, rel)]),
);
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pinned = resolvedCjsPins[moduleName];
  if (pinned) {
    return { type: 'sourceFile', filePath: pinned };
  }
  return (baseResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
