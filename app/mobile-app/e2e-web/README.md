# Mobile App — Playwright E2E (Expo web)

End-to-end tests that drive the Duncit mobile App through its **Expo web** build
(the same target `native.duncit.com` ships) in a mobile-sized Chromium, with the
GraphQL backend stubbed via request interception. Native (iOS/Android) flows stay
on Detox (`../e2e`); this covers the same screens deterministically and offline.

## Run

```bash
cd app/mobile-app
npx playwright install chromium   # one-time
npm run test:e2e:web              # auto-starts `expo start --web` on :2022
npm run test:e2e:web:ui           # interactive UI mode
```

First boot bundles via Metro (~15–20s); the dev server is reused between runs.

## How it works

- **`support/gql.ts`** — `mockGraphql(page, fixtures)` answers every `**/graphql`
  POST by `operationName`; unmocked ops return `{ data: {} }`.
- **`support/auth.ts`** — `seedAuth` seeds `localStorage['duncit.auth.token']`
  (secure-storage maps to `localStorage` on web) so the auth store hydrates
  signed-in and the Home tabs render.
- **`support/data.ts`** — fixtures for the mobile operations: `MobileMe`,
  `MobileBranding`, `MobileSuperCategories`, `MobileHomeFeed`, `MobileStatusFeed`,
  `MobileLocations`, `MobileExplorePods`.

## Coverage (bug-fix scenarios)

| Spec | Bugs |
|------|------|
| `home.pw.ts` | boot + status rail, All chip (11), Happening nearby (9), Previous Pods (8) |
| `status.pw.ts` | story viewer opens (1-4), "Your story" upload tile |
| `explore.pw.ts` | reels render, inline comments without redirect (17) |

Selectors use the app's real `testID`s (`status-mine`, `vibe-chip-all`,
`happening-nearby-header`, `previous-pods-see-all`, `reel-comment-*`,
`pod-comments-sheet`, …). Routes deep-link via the React Navigation `linking`
config (e.g. `/explore`).
