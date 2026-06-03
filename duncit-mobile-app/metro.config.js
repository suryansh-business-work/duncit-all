const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The mobile app is a standalone npm project, not a pnpm workspace member, so we
// only widen Metro's watch scope to the shared design-token package (linked via
// the `@duncit/auth-tokens` file: dependency). We deliberately do NOT add the
// monorepo root node_modules to resolution — that would mix pnpm's React copy
// with the app's and break the bundle.
config.watchFolders = [path.resolve(__dirname, '../packages')];

module.exports = config;
