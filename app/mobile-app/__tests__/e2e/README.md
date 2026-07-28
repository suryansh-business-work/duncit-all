# Mobile App — Cypress E2E (Expo web)

End-to-end tests that drive the Duncit mobile App through its **Expo web** build
(the same target `native.duncit.com` ships) in a mobile-sized viewport, with the
GraphQL backend stubbed via `cy.intercept`. Native (iOS/Android) flows stay on
Detox (`../../e2e`); this covers the same screens deterministically and offline.

These specs are the native twin of mWeb's Cypress suite — same spec names, same
assertions (rule 27). Keep them in step.

## Run

```bash
cd app/mobile-app
npx cypress install     # one-time, downloads the browser runner
npm run web             # terminal 1 — Expo web dev server on :2022
npm run test:e2e:web    # terminal 2 — headless
npm run test:e2e:web:open   # interactive runner
```

First boot bundles via Metro (~15–20s); the dev server is reused between runs.
`CYPRESS_BASE_URL` overrides the default `http://localhost:2022`.

## How it works

- **`support/commands.ts`** —
  - `cy.mockGraphql(fixtures)` answers every `**/graphql` POST by
    `operationName`; unmocked ops return `{ data: {} }` so the app's guards
    render their empty state. Later calls layer over the `beforeEach` baseline.
    The CORS preflight (`OPTIONS`) is stubbed too, since the app posts
    cross-origin to `EXPO_PUBLIC_API_URL`.
  - `cy.visitApp(path)` seeds `localStorage['duncit.auth.token']` in
    `onBeforeLoad` (secure-storage maps to `localStorage` on web) so the auth
    store hydrates signed-in and the Home tabs render. Pass
    `{ signedIn: false }` to boot the auth screens.
  - `cy.byTestId(id)` resolves the app's real `testID` (react-native-web renders
    it as `data-testid`).
- **`support/data.ts`** — fixtures for the mobile operations: `MobileMe`,
  `MobileBranding`, `MobileSuperCategories`, `MobileHomeFeed`,
  `MobileStatusFeed`, `MobileLocations`, `MobileExplorePods`.

## Coverage (bug-fix scenarios)

| Spec            | Bugs                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| `home.cy.ts`    | boot + status rail, All chip (11), Happening nearby (9), Previous Pods (8)  |
| `status.cy.ts`  | story viewer opens (1-4), "Your story" upload tile                          |
| `explore.cy.ts` | reels render, inline comments without redirect (17)                         |
| `support.cy.ts` | splash overlay, help center, chat inbox, tickets, callback, SOS (BUG-04-14) |

Selectors use the app's real `testID`s (`status-mine`, `vibe-chip-all`,
`happening-nearby-header`, `previous-pods-see-all`, `reel-comment-*`,
`pod-comments-sheet`, …). Routes deep-link via the React Navigation `linking`
config (e.g. `/explore`).
