# mWeb live E2E (`mweb-live`)

End-to-end tests that drive the real mWeb build against the **real staging
server**. Nothing here stubs GraphQL: every spec signs in or signs up as the
run's own identity, creates real pods, tickets, callbacks and ideas, and the CI
leg purges all of it afterwards.

The mocked suite next door (`__tests__/e2e`) is deterministic and offline; this
one exists to prove the flows work against the platform as deployed.

## What it covers

| Spec | Scenarios |
|------|-----------|
| `01-signup.cy.ts` | every step's validation, back keeps values, the whole walk through the WhatsApp test code into the interests survey, duplicate email, duplicate WhatsApp number |
| `02-onboarding.cy.ts` | Earn cards, the non-host gate on Create a Pod, the host application (category → survey → slot), the locked card, cancelling the meeting |
| `03-signin.cy.ts` | method chooser, password validation, wrong password, unknown address, password sign-in, code sign-in, wrong code, unknown address for a code, password recovery, old password refused |
| `04-create-pod.cy.ts` | the gate, each step's validation, the virtual branch, back keeps values, draft autosave → resume → delete, the full physical publish with a real cover upload, duplicate title, content screening, cancelling from Host Studio |
| `05-support-ticket.cy.ts` | hub, form validation, create → thread → reply → lists → resolve → rate, callback request |
| `06-pod-idea.cy.ts` | composer validation, submit → Your submissions, comment, delete comment, like, delete idea |

The specs are numbered because they run **in that order**: the account the
signup creates is the one onboarding applies with and password recovery resets,
because one WhatsApp number signs up once per run.

## The identity and the marker

The run identity comes from **Tech → E2E Tests → Settings** and reaches a spec
as `Cypress.env('E2E_EMAIL' | 'E2E_SIGNUP_EMAIL' | 'E2E_PASSWORD' | 'E2E_PHONE'
| 'E2E_STAMP')` (see `support/identity.ts`).

Every record a spec creates is named through `stamped()`, which appends
`[E2E <stamp>]`. That marker is what `purgeE2eRunData` deletes by. A record
created **without** it stays on staging forever — there is no delete a member
can call for a ticket or a callback.

## What staging must have before a run

- **Tech → E2E Tests → Settings on staging**: the identity filled in, and both
  *Hold all communications* and *Return one-time codes* switched ON. Without the
  second, no code ever comes back and the signup cannot finish; without the
  first, every run mails and messages real people.
- The **login account** exists on staging with that password, has finished the
  interests survey, and is an **approved host** with a hosting category and a
  selected city.
- One **active club** in that city for the host's category, and an **approved
  partner venue** matched to the club with **at least three open slots** — the
  publish holds one; the duplicate-title and content-screening scenarios each
  need a tile to click before they are refused.
- **Categories** at all three levels (the pod-idea composer requires a
  sub-category) and **onboarding meeting availability** (the default Mon–Sat
  10:00–17:00 window is enough).
- **ImageKit** configured, so the cover upload has somewhere to go.

## Run it locally

```bash
cd app/mweb
pnpm exec cypress install                 # one-time
pnpm build:e2e:live                       # bundle pointed at staging (.env.e2e-live)
pnpm preview &                            # serves the build on :2003
export CYPRESS_E2E_EMAIL=… CYPRESS_E2E_SIGNUP_EMAIL=… CYPRESS_E2E_PASSWORD=… \
       CYPRESS_E2E_PHONE=… CYPRESS_E2E_STAMP=$(date +%d%m%Y%H%M)
pnpm e2e:live                             # or e2e:live:open
```

From the VS Code terminal, unset `ELECTRON_RUN_AS_NODE` first or the Cypress
binary starts as plain Node.

Afterwards, purge by hand with the same identity:

```bash
E2E_APP_GRAPHQL_URL=https://staging.server.duncit.com/graphql \
DUNCIT_RELEASE_TOKEN=<staging TECH_MANAGER JWT> \
E2E_STAMP=… E2E_EMAIL=… E2E_SIGNUP_EMAIL=… node scripts/e2e-purge.mjs
```

## Recordings

Cypress records one video per spec. `cypress.config.ts` marks where every test
began and ended (`support/e2e.ts` sends a task at each end) and writes
`<video>.scenarios.json` beside the video; `scripts/e2e-videos.mjs` cuts one
clip per scenario from it and the gate posts them to the Slack thread under
the run's message, after the suite videos.
