// ESM view of the shared design tokens. Re-exports the single JSON data source
// (tokens.json) as statically-analysable named exports for Vite/rollup (mWeb)
// and Metro (mobile). Importing JSON yields a reliable default export in every
// bundler — unlike a raw .cjs, which broke Vite dev. Data lives only in tokens.json.
import tokens from './tokens.json';

export const { brand, neutral, semantic, surface, light, dark, auth, radii, typography } = tokens;
export default tokens;
