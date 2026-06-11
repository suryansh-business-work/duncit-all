/**
 * Native builds load fonts via bundled assets / expo-font, so there is nothing to
 * inject at runtime. Web has the real implementation in `web-fonts.web.ts`, which
 * Metro resolves for `platform=web`. Kept as a no-op so callers stay
 * platform-agnostic — one correct path per platform.
 */
export function loadWebFonts(): void {}
