# mWeb Cypress E2E

End-to-end tests that drive the real mWeb build in a mobile-sized viewport
(412x915). The GraphQL backend is **stubbed via `cy.intercept`**
(`support/commands.ts`), so the suite is deterministic, offline, and never
touches a real database.

## Run

```bash
cd app/mweb
pnpm exec cypress install   # one-time (downloads the Cypress binary)
pnpm build:e2e              # bundle with a same-origin /graphql
pnpm preview &              # serves the build on :2003
pnpm test:e2e               # cypress run
pnpm test:e2e:open          # interactive runner
```

## How it works

- **`support/commands.ts`**
  - `cy.mockGraphql(fixtures)` answers every `**/graphql` POST from a map keyed
    by `operationName` (value may be a function of variables). Unmocked
    operations return `{ data: {} }`; the app's optional-chaining guards render
    the empty state. Handles Apollo's single and batched bodies.
  - `cy.blockThirdParty()` stubs the Google Maps / analytics scripts so tests
    stay offline and fast.
  - `cy.seedAuth()` / `cy.clearAuth()` choose the boot state; `cy.visitApp(path)`
    applies it in `onBeforeLoad` (the `token` in `localStorage` is the only auth
    gate) and skips the boot splash.
  - `cy.useGeolocation(coords)` stubs `navigator.geolocation.getCurrentPosition`.
  - `cy.fieldByLabel(label)` resolves the control bound to a `<label>`.
- **`support/data.ts`** — reusable fixtures (`bootFixtures`, `homeFeed`,
  `podDetailFixtures`, `exploreFixtures`, …). `MwebSessionMe` is required or the
  `UserProvider` pops a "User data not loaded" modal.

## Coverage (bug-fix scenarios)

| Spec | Bugs |
|------|------|
| `auth.cy.ts` | login redirect, validation, nav to register/forgot |
| `home.cy.ts` | All chip + categories-with-pods (6), logo refresh (7), Previous Pods (8), Happening nearby (9), All chip (11) |
| `location.cy.ts` | Use-my-location auto-apply (5) |
| `pod-detail.cy.ts` | hide empty shop (12), Time & Venue (13), share (14), Club details (15) |
| `explore.cy.ts` | inline comments, no redirect (17) |
| `support.cy.ts` | support hub sections, /support/chat redirect, callback, all-tickets, ticket create, policy PDF, expired pod, keyless map |

To add a scenario: register the page's operation fixtures in `support/data.ts`
and assert against visible text / roles / the app's existing `data-testid`s.
