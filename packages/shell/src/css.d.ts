// Allow side-effect CSS imports (self-hosted @fontsource faces) to typecheck
// under the package's standalone tsconfig, which has no bundler ambient types.
declare module '*.css';
