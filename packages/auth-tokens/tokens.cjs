// CommonJS view of the shared design tokens. The actual data lives in
// tokens.json (single source of truth) so EVERY toolchain can read it without
// CJS/ESM interop hazards:
//   - mobile tailwind.config.js  -> require('../packages/auth-tokens/tokens.cjs') (Node build-time)
//   - mobile RN runtime / Jest   -> require('@duncit/auth-tokens') (exports.require -> here)
//   - mWeb Vite (dev + build)     -> import '@duncit/auth-tokens' (exports.import -> tokens.mjs -> tokens.json)
// JSON modules always expose a clean default export, which fixes Vite's dev-mode
// "does not provide an export named 'default'" error that a raw .cjs caused.
module.exports = require('./tokens.json');
