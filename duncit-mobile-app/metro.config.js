const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The mobile app is a standalone npm project, not a pnpm workspace member, so we
// only widen Metro's watch scope to the shared design-token package (linked via
// the `@duncit/auth-tokens` file: dependency). We deliberately do NOT add the
// monorepo root node_modules to resolution — that would mix pnpm's React copy
// with the app's and break the bundle.
config.watchFolders = [path.resolve(__dirname, '../packages')];

// graphql-request@6 ships an ESM build whose top-level
// `import crossFetch, * as CrossFetch from 'cross-fetch'` trips Metro's ESM↔CJS
// interop on web/Hermes: cross-fetch is CommonJS, so `_interopNamespace` tries to
// set `default` on a getter-only namespace and throws
// "Cannot set property default of #<Object> which has only a getter".
// Expo SDK 54 enables package exports, which makes Metro pick that ESM `import`
// condition. Pin the module to its CommonJS build, whose guarded `__importStar`
// helper has no such interop problem.
const graphqlRequestCjs = path.resolve(
  __dirname,
  'node_modules/graphql-request/build/cjs/index.js',
);
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'graphql-request') {
    return { type: 'sourceFile', filePath: graphqlRequestCjs };
  }
  return (baseResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
