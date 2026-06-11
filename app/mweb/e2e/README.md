# mWeb Playwright E2E

End-to-end tests that drive the real mWeb build in a mobile-sized Chromium. The
GraphQL backend is **stubbed via request interception** (`support/gql.ts`), so the
suite is deterministic, offline, and never touches a real database.

## Run

```bash
cd app/mweb
npx playwright install chromium   # one-time
npm run test:e2e                  # auto-starts `vite` on :2003
npm run test:e2e:ui               # interactive UI mode
```

## How it works

- **`support/gql.ts`** — `mockGraphql(page, fixtures)` answers every `**/graphql`
  POST from a map keyed by `operationName`. Unmocked operations return
  `{ data: {} }`; the app's optional-chaining guards render the empty state.
- **`support/auth.ts`** — `seedAuth` sets the `token` in `localStorage` (the only
  auth gate) and skips the boot splash; `clearAuth` boots signed-out.
- **`support/data.ts`** — reusable fixtures (`bootFixtures`, `homeFeed`,
  `podDetailFixtures`, `exploreFixtures`, …). `MwebSessionMe` is required or the
  `UserProvider` pops a "User data not loaded" modal.

## Coverage (bug-fix scenarios)

| Spec | Bugs |
|------|------|
| `auth.pw.ts` | login redirect, validation, nav to register/forgot |
| `home.pw.ts` | All chip + categories-with-pods (6), logo refresh (7), Previous Pods (8), Happening nearby (9), All chip (11) |
| `location.pw.ts` | Use-my-location auto-apply (5) |
| `pod-detail.pw.ts` | hide empty shop (12), Time & Venue (13), share (14), Club details (15) |
| `explore.pw.ts` | inline comments, no redirect (17) |

To add a scenario: register the page's operation fixtures in `support/data.ts`
and assert against visible text / roles / the app's existing `data-testid`s.
