# Security Verification (internal consoles)

Every internal console (everything in `PORTAL_ROLE_REQUIREMENTS`: admin, finance, tech, hr, crm, …) puts a
**Security Verification & Location Tracking** screen between a successful sign-in and the console. mWeb, the
native apps and the Partner portal (`partners`) never see it.

## What the person sees

Yellow security warning → what the server saw (public IP, **approximate** place from the IP, device, browser,
time) → their current location on an interactive map (browser permission) → the security / access / privacy /
location-notice / confidentiality / acceptable-use wording with links to the full Legal policies → four
confirmations, all unticked → **Proceed & Store IP and Location**, shut until the three acknowledgements
hold **and** there is a consented location fix (or an administrator-approved alternative).

If the browser refuses the location the screen says why it is needed, how to allow it, and offers
**Ask an administrator**. Nothing on the page skips the check.

## Why it cannot be skipped

It is enforced by the **session token**, not by the page.

| Token | Mint | What the server does with it |
|---|---|---|
| Console sign-in (`portal_key` set, not `mweb`/`native`/`partners`) | `psv: { portal, verified: false }` | Read as **signed out** on every request, SSE stream, voice route, rate limiter and socket (`decodeAuthUser`, `realtime/io.ts`). Only `me` and the verification operations see it, through `ctx.portalSecurity`. |
| After the screen | `psv: { portal, verified: true, policy, at }` | A normal session. |
| Verified, but the consent wording changed since | same token | Pending again (the token's `policy` ≠ the current version): the screen comes back at the same address. |
| No claim (mWeb, native, partners, CI, sessions older than this feature) | unchanged | Unchanged. |

Code: `server/src/modules/portals/portalSecurity/` (`portalSecurity.claims.ts` is the rule), the five session-grant
doors pass `pendingClaimFor(portalKey)` to `authPayload` (`user.auth.ts` ×3, `user.credentials.ts`,
`two-factor.service.ts`). Client: `PortalSecurityGate` in `@duncit/shell`, mounted once by `mountPortal`.

The role gate (`assertPortalLogin`), two-step sign-in and every resolver's RBAC run exactly as before; this is an
extra step, not a replacement.

### The policy version

`<notice version>+<digest of the linked Legal policies>`. Bump `PORTAL_SECURITY_NOTICE_VERSION` whenever
`noticeSections()` changes; editing the Privacy / Security / Acceptable Use / Data Retention / Grievance
Redressal policy in the Legal console changes the digest on its own (re-read every minute). Either one asks
every console session to verify again.

## What is stored

`PortalSecurityVerification` (one row per verification or refusal):

- who (id, name, email, roles) and **whether HR's team structure holds them** (seat title, department,
  employment type — snapshot at the time; the Tech detail view also shows today's answer),
- the console, the result (`VERIFIED`, `EXCEPTION_APPROVED`, `LOCATION_DENIED`), policy + notice version, the four
  consents,
- the **IP read by the server** through the trusted proxy (`req.ip`, `trust proxy` = 1 — never a header the
  client wrote), sealed; a keyed hash for exact-IP search; a masked form for the list; the approximate place,
- the coordinates + accuracy, sealed, only with consent,
- device (browser, OS, device type, user agent, device id, timezone, language).

`ip_sealed` and `location_sealed` are AES-256-GCM (the same sealing social tokens use: `SOCIAL_TOKEN_KEY`, else
derived from `JWT_SECRET`). **Retention: 180 days** (TTL index, `PORTAL_SECURITY_RETENTION_DAYS`). The access trail
(`PortalSecurityAccessLog`) is kept 365 days.

## Who can read it

SUPER_ADMIN and TECH_MANAGER only (`PORTAL_SECURITY_REVIEW_ROLES`), checked server-side on every operation.
Tech → Security → **Login verifications** lists rows (masked IP, coarse place, no coordinates); opening a row
shows the full detail and writes an access-trail entry **before** anything is decrypted — if that write fails,
nothing is shown. Each row lists who has opened it. **Verification requests** decides alternative-verification
requests (not your own; once; approval valid 24 h, spent by one verification).

MCP: only the two masked log tables are tools. The opened record (IP + GPS), the decision and the screen's own
operations are on the MCP denylist.

Account deletion: a person's own verification rows are erased with the account; the access trail and
alternative-verification requests are retained with the person's name redacted
(`accountDeletion.retention.ts`).

## Rollout notes

- **Sessions that already exist keep working** (no claim, backward compatible). A person is first verified on
  their next console sign-in. To force everyone through it sooner, use *Sign out of all devices* for the
  affected accounts (it seals older tokens).
- `nginx` must keep forwarding the real client address and Express must keep `trust proxy` at 1 — the recorded IP
  is `req.ip`. A deployment behind another proxy hop needs `trust proxy` raised, or every row records the proxy.
- **Open decision — non-console tokens.** Credentials can still obtain a token through a sign-in with no
  `portal_key` (mWeb/native), and the server has always honoured the roles on it. That token carries no `psv`
  claim, so it is not asked for the screen. Closing it means refusing console roles on tokens that did not come
  through a console sign-in, which would also log staff out of any role-dependent mWeb/app feature and needs the
  CI tokens (`DUNCIT_RELEASE_TOKEN`) re-minted with a verified claim first. It is deliberately not done here.
- Retention and the notice wording are legal text: have Legal review `noticeSections()` before relying on it.
