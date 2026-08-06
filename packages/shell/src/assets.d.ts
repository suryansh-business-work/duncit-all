// Image imports resolve to their emitted URL under Vite. Declared here because
// the package's standalone tsconfig has no bundler ambient types (same reason
// as css.d.ts) — each consuming portal's Vite build does the actual emitting.
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}
