/**
 * `@duncit/verification/mui` — the verification cards mWeb and the portals render.
 *
 * The native app does NOT import this subpath: it renders the same rules from
 * the package root through its own Tamagui view (rule 40 — share the logic,
 * never the UI).
 */
export { default as VerificationCards } from './VerificationCards';
export { default as VerificationCardShell } from './VerificationCardShell';
export { default as IdentityCard } from './IdentityCard';
export { default as AddressCard } from './AddressCard';
export { default as EmailCard } from './EmailCard';
export { MY_VERIFICATIONS, SUBMIT_ADDRESS_VERIFICATION, SUBMIT_VERIFICATION } from './queries';
export { fallbackT, useTranslation, VERIFICATION_FALLBACK_FLAT, type Translate } from './i18n';
