// Audio imports resolve to their emitted URL under Vite. Declared here because
// the package's standalone tsconfig has no bundler ambient types — each
// consuming app's Vite build does the actual emitting.
declare module '*.mp3' {
  const src: string;
  export default src;
}
