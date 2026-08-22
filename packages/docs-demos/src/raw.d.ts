/**
 * `?raw` imports, so a demo file can show its own source.
 *
 * Vite understands the suffix; TypeScript does not, and this package is
 * type-checked on its own (`pnpm --filter @duncit/docs-demos typecheck`) rather
 * than only through a consuming app's `vite/client` types.
 */
declare module '*?raw' {
  const content: string;
  export default content;
}

/**
 * Asset imports, so a demo can import a package that imports one.
 *
 * `@duncit/shell` pulls in its bundled fallback icons and its chat sounds as
 * modules; Vite resolves them to URLs and TypeScript needs telling. Declaring
 * them here rather than depending on `vite/client` keeps this package
 * type-checkable on its own, which is what the CI gate runs.
 */
declare module '*.svg' {
  const url: string;
  export default url;
}
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.jpg' {
  const url: string;
  export default url;
}
declare module '*.mp3' {
  const url: string;
  export default url;
}

/**
 * `import.meta.env`, which several packages read for their build-time config.
 *
 * Vite injects it; TypeScript needs the shape declared, and depending on
 * `vite/client` here would make this package's own typecheck require a bundler
 * it does not otherwise need.
 */
interface ImportMeta {
  readonly env: Record<string, string | boolean | undefined>;
}
