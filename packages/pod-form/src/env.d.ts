/**
 * `import.meta.env`, which `GoogleMapPreview` reads for the Google Maps key.
 *
 * Vite injects it; TypeScript needs the shape declared, and depending on
 * `vite/client` here would make this package's own typecheck require a bundler
 * it does not otherwise need — the same reason `@duncit/docs-demos` declares
 * it. A consuming app never sees this file: it is not imported by any module,
 * so only this package's own `include` pulls it in.
 */
interface ImportMeta {
  readonly env: Record<string, string | boolean | undefined>;
}
