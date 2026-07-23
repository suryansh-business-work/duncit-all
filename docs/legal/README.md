# Duncit — Legal Documents (drafts)

This folder contains **drafts** of Duncit's core legal documents, written from a direct analysis of the codebase (server models + services) so they describe what the Platform actually does:

- [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) — user-facing privacy notice.
- [`DATA_POLICY.md`](./DATA_POLICY.md) — internal/technical data-protection policy incl. the **full "what's in the database" inventory** across all ~90 collections.
- [`TERMS_OF_USE.md`](./TERMS_OF_USE.md) — the user agreement, drafted to protect Duncit (intermediary status, disclaimers, limitation of liability, indemnity, IP, dispute resolution).

> ⚠️ **These are drafts, not legal advice.** Have them reviewed and finalised by a qualified lawyer (Indian data-protection / IT / consumer / tax) before publishing. They are drafted primarily under **Indian law** (DPDP Act 2023; IT Act 2000 & IT Rules 2021; Consumer Protection Act 2019) with GDPR-style clauses for non-Indian users. Adjust for every market you operate in.

---

## 1. Fill these placeholders before publishing

Search for `[` across the three files and complete each:

- `[LEGAL_ENTITY_NAME]`, `[CIN]`, `[REGISTERED_ADDRESS]`
- `[EFFECTIVE_DATE]`
- `[GRIEVANCE_OFFICER_NAME]`, `[GRIEVANCE_EMAIL]`, `[GRIEVANCE_PHONE]`
- `[DATA_PROTECTION_OFFICER]`, `[PRIVACY_EMAIL]`, `[SUPPORT_EMAIL]`
- `[JURISDICTION_CITY]`
- `[MINIMUM_AGE]` (and enforce it — see §2)
- Retention periods (`[e.g. up to 8 years]`), liability cap numbers, arbitration-vs-courts choice, limitation window.

## 2. Where to publish

The app already links **Terms → `duncit.com/terms`** and **Privacy → `duncit.com/privacy/policy`**, rendered from the `Policy` collection (slug + HTML `content`) and shown by mWeb's `PolicyRenderer`. To go live:
1. Have counsel finalise the Markdown.
2. Convert to HTML (the policy editor stores rich-text/HTML).
3. Create/Update the policies in the Admin/Legal portal with slugs e.g. `terms`, `privacy` (or `privacy-policy`), `data-policy`, and set them active.

The versioned `LegalDocument` collection (Legal portal) can hold the authoritative internal copies with change history.

---

## 3. ⚠️ Compliance & security gaps to close (policy ↔ reality)

A policy only protects Duncit if the product **matches** it. The analysis surfaced the following items — resolve or consciously accept each, and make sure the final policy wording reflects the truth. These are **product/engineering/legal actions**, not just wording:

| # | Finding | Risk | Suggested action |
|---|---|---|---|
| 1 | **Minor age gate is weak.** Only real hard gate is **18+ for hosts**. General sign-up uses an admin birth-year window (default youngest ≈ 13) enforced mainly in the **app UI**, with no server-side rejection. | **High.** India's DPDP Act 2023 treats **under-18 as children** requiring **verifiable parental consent**. Collecting minors' data without it is a violation; app-store policies also apply. | Decide the firm minimum age; **enforce it server-side** at signup; if under-18 are allowed, build a verifiable parental-consent flow. Then state the real number in the Privacy Policy §12 / Terms §2. |
| 2 | **Auth tokens do not expire and aren't revoked on logout/deletion.** JWTs are signed without `expiresIn`; there's no server-side session store. | Medium–High. A leaked token stays valid; "delete account" doesn't invalidate an issued token. | Add token expiry + refresh, and a revocation/denylist (or bump a per-user token version) invalidated on logout, password change and deletion. Then the security claims in Privacy §13 / Data §8 hold. |
| 3 | **Third-party secrets & the Web-Push private key are stored in the DB in plaintext** (masked only in the UI); **no application-level encryption at rest.** | Medium–High. DB/backup exposure leaks live payment/comms/AI credentials. | Encrypt secrets at rest (KMS/envelope encryption or a secrets manager); rotate the keys that were stored in plaintext. |
| 4 | **No rate limiting / throttling** on auth or API endpoints (the "bouncer" module is a support queue, not a limiter). | Medium. Brute-force / OTP-guessing / scraping exposure. | Add rate limiting on login, OTP request/verify, and expensive endpoints. |
| 5 | **Indefinite retention** of high-value PII: KYC/government IDs, payments, bank details, support/chat, CRM leads, WhatsApp user-leads, behavioural `AppEvent` logs — no TTL. | Medium. Storage-limitation principle; larger breach blast-radius. | Define and automate retention/deletion for each (DATA_POLICY §6), especially KYC after partnership ends and behavioural analytics. |
| 6 | **Account deletion is "anonymise credentials + strip relations", not full erasure**; the `User` doc (name/DOB/bio/avatar) and **Payment billing snapshots** (name/email/phone/GST address) are retained. | Low–Medium **if disclosed** (retaining financial records for tax is legitimate). | The Privacy Policy already discloses this — keep it accurate. Provide a manual full-erasure path for valid requests where no legal hold applies. |
| 7 | **WhatsApp sign-up OTP is a stub** (dev echoes a fixed code; production send is a placeholder). | Low (security) / disclosure. | Don't advertise WhatsApp OTP as a security control until it actually sends; either finish it or remove the path. |
| 8 | **Grievance Officer & timelines are mandatory** (IT Rules 2021) and must be **real and monitored**. | Compliance. | Appoint a named officer, publish contact + response SLAs, and actually staff the inbox. |
| 9 | **Precise SOS location & call recordings** are collected. | Sensitive processing. | Ensure explicit consent + purpose limitation + short retention; call out recording consent to both parties. |
| 10 | **Tax/GST invoice retention** period must match statute. | Compliance. | Have counsel confirm the exact period and set it in DATA_POLICY §6 and PRIVACY §10. |

> **"Duncit secure in every case"** = the Terms give strong legal protection (intermediary status, disclaimers, liability cap, indemnity, dispute resolution), **and** the Privacy/Data policies are accurate — but items 1–10 above are where paper protection and real-world compliance can diverge. Closing them is what makes the protection durable.

---

## 4. Source of truth

These drafts were generated from an analysis of `server/src/modules/**/*.model.ts` (~90 collections), `server/src/services/**`, and the auth/finance/CRM/verification services as of app version **1.4.59**. Re-verify against the code before each release, since data practices change.
