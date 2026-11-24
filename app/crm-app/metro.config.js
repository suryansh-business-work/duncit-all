const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// A standalone npm project, not a pnpm workspace member: Metro watches the
// shared packages it links (file: deps) and nothing else. The monorepo root
// node_modules is deliberately NOT added — mixing pnpm's React copy with this
// app's breaks the bundle.
config.watchFolders = [path.resolve(__dirname, '../../packages')];

// Linked packages are bundled from their own SOURCE, so their peer imports
// resolve by walking up from packages/<name>/ — which finds nothing in CI,
// where only this app is installed. Point those names at this app's copy.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  zod: path.resolve(__dirname, 'node_modules/zod'),
  'date-fns': path.resolve(__dirname, 'node_modules/date-fns'),
  'date-fns-tz': path.resolve(__dirname, 'node_modules/date-fns-tz'),
};

// graphql-request@6's ESM build trips Metro's ESM/CJS interop on cross-fetch;
// its CommonJS build does not (the member app pins it the same way).
const cjsPins = {
  'graphql-request': path.resolve(__dirname, 'node_modules/graphql-request/build/cjs/index.js'),
};
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pinned = cjsPins[moduleName];
  if (pinned) return { type: 'sourceFile', filePath: pinned };
  return (baseResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
