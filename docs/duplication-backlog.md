# Duplication backlog

Companion to [docs/duplication-audit.md](duplication-audit.md). The audit is a
point-in-time **measurement** (2026-07-28); this file is the **live backlog** —
what has actually been built since, what is still open, and what new duplication
has appeared in the meantime.

**Measured:** 2026-08-20, on `staging` @ v1.62.1.

Every count below was produced from the tree, not estimated. To re-measure:

```bash
# byte-identical files across portals
find portals -path '*/src/*' \( -name '*.tsx' -o -name '*.ts' \) \
  -not -path '*/node_modules/*' -not -path '*/generated/*' \
  -exec md5sum {} + | sort | awk '{h[$1]=h[$1]" "$2; c[$1]++} END {for (k in c) if (c[k]>=4) print c[k]"x"h[k]}' | sort -rn

# exported symbols declared in BOTH mWeb and the native app
for ws in app/mweb/src app/mobile-app/src; do
  grep -rhoE '^export (const|function|type|interface) [A-Za-z_][A-Za-z0-9_]*' "$ws" \
    --include=*.ts --include=*.tsx | awk '{print $3}' | sort -u > "/tmp/$(basename "$(dirname "$ws")").txt"
done
comm -12 /tmp/mweb.txt /tmp/mobile-app.txt
```

---

## 1. Status of the July audit — 0 of 8 packages built

None of the audit's proposals have shipped. Every cluster it named is still live,
so **the backlog below is additive to that document, not a replacement for it.**

| Audit proposal | Status | Measured today |
|---|---|---|
| §1 extend `@duncit/shell` — portal boot | ✅ closed | Not as proposed — see §2.1. Most of it was already extracted; the rest was dead code, now deleted |
| §2 extend `@duncit/utils` — framework-free logic | ❌ open | — |
| §3 **NEW** `@duncit/pod-filters` | ❌ open | all 4 file pairs still present |
| §4 **NEW** `@duncit/test-kit` | ❌ open | 13 × `testkit.tsx`, 6 × `table-mock.tsx` |
| §5 **NEW** `@duncit/site-data` | ❌ open | 4 × `site-data.ts` |
| §8 **NEW** `@duncit/gql-documents` | ❌ open | — |
| §9 **NEW** `@duncit/build-preset` | ❌ open | 18 vite configs |
| §10 **NEW** `@duncit/access` | ❌ open | — |
| §12 server `serialize.ts` / `errors.ts` / `singleton.ts` / `entity-id.ts` | ❌ open | 24 local `iso`, 14 local `round2`, `getOrCreateSingleton` exists **0** times |
| "Already solved — just import it" adoption gaps | ❌ open | `app/mweb/src/utils/parseApiError.ts`, `app/mweb/src/hooks/useFeatureFlag.ts`, `app/mweb/src/ColorModeContext.tsx` all still local |

`server/src/utils/` currently holds `address.ts`, `age.ts`, `contact.ts`,
`mongoTransaction.ts`, `outboundFetch.ts`, `phone.ts`, `table-query.ts`,
`validate.ts` — none of the four modules the audit proposed.

---

## 2. New findings since the audit

### 2.1 Portal boot: mostly already solved, and one pile of dead code

A byte-identical file count makes this cluster look far worse than it is.
Reading the files changes the conclusion completely, in two different
directions.

**Most of it is already extracted.** `apollo.ts` (5 lines), `lib/session.ts`
(12), `theme.ts` (5), `pages/LoginPage.tsx` (10) and `components/AppShell.tsx`
(37) are **thin adapters that already import from `@duncit/shell`**. Each one
binds the shared implementation to that portal's own `appConfig` — the token
key, the required roles, the accent, the nav. They are byte-identical only
because the binding is uniform; there is no logic left in them to share. The
audit's own "Do NOT extract" section makes exactly this argument about the
socket boilerplate ("once you subtract the token source, the URL source… ~10
lines remain"), and it applies here too. **Leave them.**

**The rest was dead.** `GoogleSignInButton.tsx` — 17 copies, 95 lines each, in
three drifted variants — was imported by **nothing** in any portal's `src/`.
Neither `@duncit/shell` nor `@duncit/user-context` renders it: the portal login
flow is `PortalLoginPage` → `LoginScreen`, whose "extra content" slot holds
`OtpLoginPanel`, not a Google button. The copies were leftovers from before the
login page was consolidated, kept alive only by their own tests.

Deleted in this change: 17 components + 12 orphaned test files ≈ **1,615 LOC**,
with zero production references. `app/mweb`'s copy is **kept** — it is live
(`LoginCard`, `RegisterPage`, `ConnectedAccountsSection`), it resolves the
client id from mWeb's own `runtimeConfig` rather than the shell, and mWeb does
not (and should not) depend on `@duncit/shell`, which is portal chrome.

> If portal Google sign-in is *wanted*, that is a feature decision, not a
> refactor — wire it into `PortalLoginPage`'s extra slot once, in the shell.
> Three of the seventeen copies had independently discovered that the v8
> coverage provider mis-instruments a `boolean ? literal : literal` ternary and
> rewritten it as an `if`; that fix is worth carrying over if it is ever
> rebuilt.

Still genuinely open in this area:

| File | Byte-identical | Note |
|---|---|---|
| `src/main.tsx` | — / 19 | Near-copies; real per-portal wiring |
| `src/config/url-configs.ts` | — / 18 | Near-copies. `appUrl` has **zero** readers repo-wide and is wrong in at least one portal (hr advertises ads-portal's host) — delete the field rather than share it |
| `src/components/MediaPickerDialog.tsx` | **5** | Not in the audit, which named the *Field*. Genuine, small |

### 2.2 Five new mWeb ↔ native twins, all built after the audit

| Cluster | mWeb | Native |
|---|---|---|
| Duncit Coin | `src/pages/duncit-coin-page/`, `useCoinRedemption`, `src/theme/coinGold.ts` | `src/components/duncit-coin/`, `src/components/checkout/CoinRedeemField.tsx` |
| Gift cards | `gift-cards-page/`, `gift-card-checkout-page/`, `gift-card-claim-page/`, `gift-card-redeem-page/` | `src/components/gift-cards/` |
| Membership | `membership-page/PlanCards.tsx`, `ComparisonTable.tsx`, `NotifyCard.tsx` | `components/membership/MembershipPlanCards.tsx`, `MembershipComparison.tsx`, `MembershipNotifyCard.tsx` |
| Survey | `SURVEY_COLORS`, `splitSections`, 8 survey types | same names |
| Report a problem | `useReportProblemConfig`, `ReportProblemFormConfig` | same names |

Shared symbols confirmed in both trees include `COIN_GOLD_DARK`,
`COIN_GOLD_LIGHT`, `COIN_GOLD_TINT`, `COIN_TILE`, `maxRedeemableCoins`,
`GiftCardSettings`, `GiftCardRedeemResult`, `giftCardGradient`.

### 2.3 Verification is now triplicated — and has already drifted

```
portals/partners-app/src/pages/verification-page/   MUI      VerificationCardShell.tsx = 47 lines
app/mweb/src/pages/verification-page/               MUI      VerificationCardShell.tsx = 40 lines
app/mobile-app/src/screens/VerificationScreen/      Tamagui
```

The two MUI copies carry the **same filenames** — `VerificationCardShell.tsx`,
`AddressCard.tsx`, `IdentityCard.tsx`, `queries.ts` — and already differ by 89
diff lines. Two MUI copies of one screen is exactly what rule 40 forbids; this
is the clearest new package candidate in the repo.

### 2.4 Form schemas — 14 duplicated RHF + Zod pairs

Declared in both `app/mweb/src` and `app/mobile-app/src`:

```
loginSchema · forgotPasswordSchema · resetPasswordSchema · newPasswordSchema
currentPasswordSchema · deleteAccountSchema · accountEditSchema · addressSchema
checkoutSchema · createPodSchema · productCheckoutSchema · buildWithdrawSchema
buildGrievanceSchema
```

…each with its matching `*Defaults` and `*Values` type, plus the `make*Schema`
localized-message variants (`makeLoginSchema`, `makeCheckoutSchema`,
`makeCreatePodSchema`, …).

Audit §10 proposed a MUI-free `/schemas` subpath on `@duncit/forms` for the
*portal* half. This mWeb ↔ native cluster is separate and larger. Zod is
zero-dependency, so it is a clean extraction — but note audit §"Do NOT extract":
`CreatePodFormValues` genuinely differs (mWeb holds `pod_date_time: Date | null`,
mobile holds `pod_date_time_text: string` because RN inputs are strings). Share
the rules, not that one shape.

### 2.5 Server: six entity-ID counters, zero singleton helpers

`server/src/modules/venues/entityIdCounter.ts` carries the comment *"rule 34 —
one implementation"*. There are now six, each with **its own Mongo collection**:

- `modules/venues/entityIdCounter.ts`
- `modules/clubs/clubAdminProfile/`
- `modules/content/contract/`
- `modules/content/grievance/`
- `modules/content/legalDocument/`
- `modules/content/policy/`

Separately, 21 service files hand-roll the `$setOnInsert` singleton pattern that
audit §12 proposed consolidating into `getOrCreateSingleton` — which still does
not exist.

### 2.6 Duplicated React hooks — 24 of them, but they cannot move as-is

`useShopFilters`, `useHomeData`, `useSearchDiscovery`, `useSearchCategories`,
`useCoinRedemption`, `useQuickAddToCart`, `useSavedPodHearts`, `usePodSocket`,
`useSupportChat`, `useMailPreferences`, `useWhatsAppPreferences`,
`useSignupPolicies`, `useReportProblemConfig`, `useServerIssue`,
`useProfileAvatar`, `useStatusUpload`, `useActiveAds`, `usePodListFilters`,
`usePodProductSelection`, `useCategoryLevel`, `useRoleLabels`,
`useCheckoutEligibility`, `useProductShippingQuote`, `usePaymentFailure`.

See the constraint in §3 — extract the pure reducer, keep the `useX` wrapper thin
and local. This is what audit §3 already prescribed for `useShopFilters`.

---

## 3. The constraint that shapes every proposal

**Every package the native app consumes has an empty `dependencies` block.**
Verified across all fifteen entries in `app/mobile-app/Dockerfile`:

```
auth-tokens · logs · geo · regex · errors · slack · datetime · fallback-icons
i18n · user-core · utils · onboarding · tours · virtual-scroll · slots
```

`@duncit/slots` is the only one declaring a `react` peer — and the native app
imports **only its root** (framework-free logic); the MUI calendar lives behind
the `./mui` subpath the app never touches. That is the proven pattern:

> **Root entrypoint framework-free; React/MUI/Tamagui behind a subpath.**

Consequences for anything below that targets the native app:

- A new `@duncit/*` dependency on `app/mobile-app` needs `COPY` lines in **both**
  `app/mobile-app/Dockerfile` **and** `Dockerfile.android`. This passes locally
  and fails only in the deploy build.
- Code leaving `app/mobile-app/src` leaves its 100/100/100/100 jest gate, so the
  tests move with it and the receiving package needs its own gate.

---

## 4. Ranked proposals

### Tier 1 — byte-identical, zero new dependencies

| Target | What moves | LOC | Notes |
|---|---|---|---|
| ~~extend `@duncit/shell` (portal boot)~~ | — | — | **Done / withdrawn.** See §2.1: the adapters are irreducible wiring and `GoogleSignInButton` was dead code, now deleted |
| `server/src/utils/serialize.ts` + `errors.ts` | 24 `iso`, 14 `round2`, 9 competing error helpers | ~300 | The variants have genuinely different null/NaN behaviour — pick semantics deliberately |
| `server/src/utils/singleton.ts` | `getOrCreateSingleton` | ~40 | Closes a check-then-act race against a `unique` index |
| delete `urlConfigs.appUrl` | dead field in 18 files | ~18 | Zero readers repo-wide; wrong value in at least one portal |

### Tier 2 — new packages

| Package | What moves | Consumers |
|---|---|---|
| **NEW** `@duncit/form-schemas` | 14 Zod schemas + defaults + value types | mWeb, native (Zod is zero-dep) |
| **NEW** `@duncit/verification` | `VerificationCardShell`, `AddressCard`, `IdentityCard`, `queries`, `STATUS_META` | partners-app + mWeb (MUI); native shares the logic half |
| **NEW** `@duncit/pod-filters` *(audit §3)* | host-pods, pod-history, shop, insights filters | mWeb, native |
| **NEW** `@duncit/test-kit` *(audit §4)* | 13 testkits, 6 table-mocks, cypress commands + login specs | 17 portals, dev-only |
| **NEW** `@duncit/build-preset` *(audit §9)* | tsconfig → cypress → vite → vitest | all |

### Tier 3 — extend what exists

| Package | What to add |
|---|---|
| `@duncit/utils` | coin math (`maxRedeemableCoins`, the `COIN_*` tokens), `buildBreakup` (client half), URL builders (`mailtoUrl`, `telUrl`, `whatsappUrl`, `venueMapUrl`, `trackingUrl`, `locationMapQuery`) |
| `@duncit/geo` | `COUNTRY_CODES`, `countryByDial`, `countryFlagUrl`, `phoneDigits` |
| `@duncit/media-picker` | `MediaPickerDialog` (5 byte-identical) + `MediaPickerField` (3) |
| `@duncit/theme` | retire mWeb's `ColorModeContext` fork |

---

## 5. Suggested order

1. ~~`@duncit/shell` portal boot.~~ **Resolved** — see §2.1. Deleting beat
   extracting, which is worth remembering before trusting the next
   byte-identical count: *read the files before sizing the win.*
2. **Server `serialize.ts` / `errors.ts` / `singleton.ts`.** No package — server
   imports zero `@duncit/*` by design.
3. **`@duncit/form-schemas`.** Zod is zero-dep; kills 14 twin pairs.
4. **`@duncit/verification`.** Small, and already drifting — catch it now.
5. Then follow the audit's own migration order (§"Migration order") for the rest.

**Gotchas that apply to every step:**

- Deleting a duplicated file leaves a dead entry in that portal's vitest
  `coverage.exclude` list and moves the coverage denominator. Run
  `test:coverage`, not just `typecheck`.
- Any new user-facing string must land in `packages/i18n` **and** be seeded via
  Admin → Localization → *Import app keys* before the code ships (rule 38).
- Several of these are behaviour changes, not refactors, and must be called out
  in their PRs: the portal mutation-retry fix, and any surface that starts
  honouring the admin-configured date format.
