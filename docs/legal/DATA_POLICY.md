# Duncit — Data Protection & Data Usage Policy (Data Policy)

> **DRAFT — NOT LEGAL ADVICE.** Prepared from a direct analysis of the Duncit database models and services so it reflects what the Platform actually stores and processes. **Have qualified counsel review it** and fill every `[PLACEHOLDER]`. This document is the technical companion to the Privacy Policy; where they differ, the Privacy Policy governs the user-facing relationship.

**Effective date:** `[EFFECTIVE_DATE]`  ·  **Owner:** `[DATA_PROTECTION_OFFICER / GRIEVANCE_OFFICER]`  ·  **Applies to:** `[LEGAL_ENTITY_NAME]` and all Duncit services.

---

## 1. Purpose & principles

This Data Policy documents, for accountability and compliance (India DPDP Act 2023; IT Act 2000 & SPDI/IT Rules; and, where applicable, GDPR), **exactly what data Duncit stores, why, where it goes, how long it is kept, and how it is protected.** We commit to: lawful, fair and transparent processing; purpose limitation; data minimisation; accuracy; storage limitation; integrity/confidentiality; and accountability.

## 2. Data classification

| Class | Examples | Handling |
|---|---|---|
| **Highly sensitive** | Passwords, OTP hashes, bank/UPI details, Aadhaar/PAN/ID documents, precise geolocation, third-party secrets/API keys | Strictest access controls; never exposed to other users; encrypted in transit; hashed where applicable |
| **Sensitive personal** | DOB, government IDs, financial/billing, health/safety data, private messages, GSTIN | Need-to-know access; role-gated |
| **Personal** | Name, email, phone, address, profile, photos, activity/engagement, device & analytics identifiers | Access-controlled; used per stated purposes |
| **Non-personal** | Categories, clubs, inventory/stock, slot templates, policies/content, feature flags, aggregate metrics | Standard controls |

## 3. Full data inventory — "what the database stores"

The following is a complete, category-by-category inventory of the personal and sensitive data held across the ~90 data collections. **(P)** = personal, **(S)** = sensitive/security-critical.

### 3.1 Account & identity
- **(P)** first name, last name, date of birth, gender, profile photo, bio, country, locale, timezone; optional pet profile and profile links.
- **(P/S)** email; email-verification status; auth provider (email / Google) and Google account link; last-login provider/time.
- **(S)** password — **bcrypt** hash (cost factor 10), never returned by default queries; Google-only accounts have no password.
- **(S)** OTP hashes for email verification, password reset, password change and **account deletion** — SHA-256, peppered with a server secret, short expiry (~10 minutes).
- **(S)** security counters: failed-login attempts, lockout window, password-changed timestamp, 2FA flag.
- Roles/permissions (role keys), account status, profile visibility (public/private), assigned zones, soft-delete timestamp.
- Identity/address/email **verification** records, including an **(S)** uploaded ID document URL and address snapshot, review status and reviewer.

### 3.2 Contact details
- **(P)** phone number and extension (verification flag); **(P)** WhatsApp number and extension; **(P)** phone/email attached to saved addresses and to leads, hosts, venues, brands and applicants.

### 3.3 Profile & user-generated content
- **(P)** posts/stories (image/video URL, caption, likes, comments, story views + expiry); pod ideas (title/description/likes/comments).
- **(P/S)** pod chat messages and support/ticket messages (author, text, image, reactions, attachments) — free-text content.
- **(P)** pod comments/likes, co-hosts, attendees; product reviews (rating, comment, images, votes, seller reply); club ratings; bouncer feedback.
- Uploaded images/videos/reels across pods, posts, reviews, verification, venue/brand galleries; **(S)** AI media-moderation scan log (URL, file name, user id, risk, summary).

### 3.4 Location & address
- **(P)** profile address (lines, landmark, city, state, PIN, country) and flat geo (city/state/pincode/zone/selected location); saved **address book** entries (delivery/billing).
- **(P)** billing snapshot on payments; **(P)** shipping address on product orders.
- **(P/S)** in-event safety ("bouncer") **precise location (lat/lng/accuracy)** + contact phone at time of alert.
- Venue coordinates (lat/lng) and pickup-location contact + address; the city/zone/pincode catalogue (non-personal).

### 3.5 Financial & payment
- Wallet balance and transactions; **(S)** withdrawal beneficiary details: account holder name, account number, IFSC, UPI ID, payout method.
- Payments: **(P)** payer name/email/phone; billing incl. **(S)** GSTIN; gateway references (Razorpay); invoice number; amounts; coupon code. **We do not store full card/CVV/UPI-PIN.**
- Payment releases (beneficiary name/email, bill/evidence URLs); back-out refund records; product orders (buyer name/email/phone, shipping address, courier/tracking ids).
- Business finance settings (org GSTIN/address, invoice config), founder/coupon/expense config — organisational, not user PII.

### 3.6 Government / KYC identifiers (sensitive)
- **Hosts:** Aadhaar number, PAN, passport/ID photo, police-verification document, full name, DOB, address, bank details.
- **Venue partners:** GSTIN, PAN, document uploads (GST certificate, trade licence, owner ID), owner name/email/phone/DOB/address, bank details, precise coordinates.
- **Brand partners:** GSTIN, PAN, document uploads (GST certificate, trademark, owner ID), contact person details, bank details, address, website/Instagram links.
- GSTIN on payment billing and on e-commerce leads; ID document on verification records.

### 3.7 Communications & CRM
- **(P)** support chat sessions/messages, support tickets (threads, attachments, ratings, feedback), contact-form submissions, FAQ submissions, newsletter subscriptions.
- **(S)** user contact actions and CRM communication logs — call recordings/URLs, transcripts, email bodies, external ids, notes.
- **(P)** WhatsApp cached contacts (phone, name), groups, and materialised user-leads; **(S)** gateway API key.
- **(P)** CRM leads (venue/host/e-commerce): embedded contacts (name/role/mobile/WhatsApp/email), addresses, map/social links, activity logs; host requests; interviews and onboarding meetings (applicant name/email/phone, business details, meeting link, feedback); lead-survey answers; **(P)** job applications (name/email/phone, résumé/portfolio, cover note).
- Marketing campaigns (audience targeting, rendered content, recipient counts).
- Notifications: target user ids; **(S)** push delivery — Web Push subscription (endpoint/keys/user-agent), Expo push token, and a Web-Push signing key.

### 3.8 Engagement & social graph
- **(P)** follow graph (user→user, club, pod), interests, saved pods, referrals (codes and referrer→referred edges), badges/challenges awards, pod membership records (status, referred-by, refund links).

### 3.9 Analytics & telemetry
- **(P)** active-user pings (device id, user id, date, category, hit count).
- **(P)** app events (user id, device id, event type, path/route/title, click target text/label/href, pod/checkout references, metadata) — behavioural analytics.
- Telemetry logs (app/portal/platform/os/environment/source, page/component, **(P)** URL, host, **(S)** error name/message/stack, arbitrary data payload). Bug rollups (fingerprint, counts, last URL/host/stack). Status/incident records (no PII).
- We do not intentionally store IP address or raw user-agent in application logs (a user-agent is stored only with a Web-Push subscription).

### 3.10 Platform / configuration (secrets — not user PII)
- **(S)** API keys (SHA-256 key hash + prefix + owner + scopes; raw key never stored).
- **(S)** third-party credentials store (EnvEntry `config`) for email/SMTP, ImageKit, Pexels, Google OAuth/Maps, Twilio, OpenAI, Sarvam, Razorpay, ShipRocket, etc.; legacy comms-provider config.
- App settings (JWT config, date/time/timezone, birth-year bounds, retention days), feature flags, branding, upload settings.

## 4. Processing purposes (lawful basis map)

| Purpose | Data used | Basis |
|---|---|---|
| Account & authentication | identity, credentials, security counters | Contract / legitimate interest |
| Pods, clubs, bookings, chat | profile, content, membership, engagement | Contract |
| Payments, payouts, orders, invoices | financial, billing, bank, address, GSTIN | Contract / legal obligation |
| KYC & partner onboarding | government IDs, DOB, address, bank | Legal obligation / consent |
| Content moderation & safety | submitted content, images, media scan log, SOS location | Legitimate interest / consent (location) |
| Analytics & product improvement | device id, app events, telemetry | Legitimate interest / consent (where required) |
| Communications (transactional & marketing) | email, phone, WhatsApp, message content | Contract / consent (marketing) |
| Legal, tax, fraud, disputes | financial, KYC, audit, communications | Legal obligation / legitimate interest |

## 5. Data flows to sub-processors

See the Privacy Policy, Section 8, for the current provider table. Key flows:
- **Razorpay** — payment amount/reference + prefill email/phone; card/UPI credentials handled by the gateway, not by Duncit.
- **ShipRocket** — recipient name, address, email, phone, order items for delivery.
- **ImageKit** — all uploaded media and document attachments.
- **OpenAI (GPT-4o)** — submitted pod/product text and a limited number of image URLs for moderation.
- **Sarvam AI / Twilio / WhatsApp gateway** — CRM call/message data (numbers, recordings, transcripts, content).
- **Google** — Google sign-in token; Maps.
- **Email/SMTP** — recipient email, message content, PDF attachments.
- **SigNoz/OpenTelemetry** — logs/traces (may incidentally contain identifiers).

Each sub-processor is engaged under a contract with confidentiality and security terms. A current sub-processor register is maintained by `[DATA_PROTECTION_OFFICER]`.

## 6. Retention schedule

| Data | Retention |
|---|---|
| Active account & profile | Life of the account |
| Login identifiers (email/phone/Google/password) | Removed on account deletion |
| Social relationships (follows, interests, saved) | Removed on account deletion |
| Payment / invoice / GST / payout records | Statutory financial-record period (`[e.g. up to 8 years]`), retained post-deletion |
| KYC / ID documents (host/partner) | Duration of partnership + statutory period, then delete/anonymise |
| Stories | ~24 hours (auto-expire) |
| Diagnostic/telemetry logs | ~30 days (configurable), hard cap 90 days |
| Uptime/status history | ~90 days |
| Draft pods | ~3 days |
| Support, moderation, safety, audit logs | As needed for integrity, disputes and legal defence |

`[COUNSEL to confirm statutory periods and finalise this schedule.]`

## 7. Data subject / data-principal request (DSAR) handling

1. **Intake** — via `[PRIVACY_EMAIL]` / Grievance Officer / in-app.
2. **Verify identity** to prevent unauthorised disclosure.
3. **Log** the request and its due date.
4. **Fulfil** — access/copy, correction, deletion (per Section 6 constraints), portability, or objection/restriction — within the statutory timeframe.
5. **Respond** with the outcome and, if refused (e.g., data retained for legal reasons), the reason.

## 8. Security controls

- **In transit:** HTTPS/TLS to all Platform endpoints (TLS terminated at the reverse proxy).
- **Passwords:** bcrypt (cost 10), `select:false`; OTPs SHA-256 + server pepper with short expiry; API keys stored as SHA-256 hashes only.
- **Access control:** role-based (portal-scoped roles) with city/zone scoping; least-privilege internal access.
- **Payment/webhook integrity:** HMAC signature verification and timing-safe comparisons on payment and delivery webhooks.
- **Uploads & moderation:** size limits, format restrictions, and AI screening of media/content.
- **Secrets:** third-party credentials centralised in the configuration store; masked in operator UIs.

**Known remediation items** (tracked in `README.md` — address to strengthen the security posture the policies rely on): encryption-at-rest for stored third-party secrets and push-signing keys; authentication-token lifetimes/rotation and revocation on logout/deletion; server-side age enforcement; and reduction of long-lived, un-expiring PII collections.

## 9. Breach management

On discovering a personal-data breach, we will: contain and assess it; record it; notify the Data Protection Board of India and affected individuals where the breach is likely to cause harm, within the timeframe required by law; and remediate. `[Attach the internal incident-response runbook reference here.]`

## 10. Roles & responsibilities

- **Data Protection / Grievance Officer:** `[NAME, CONTACT]` — owns this Policy, the sub-processor register, DSARs and breach response.
- **Engineering:** implements and maintains the security controls in Section 8 and the retention automation in Section 6.
- **All staff:** follow least-privilege access and report suspected incidents immediately.

## 11. Review

This Policy is reviewed at least annually and upon any material change to data practices, sub-processors, or applicable law.

---

*Maintained by `[LEGAL_ENTITY_NAME]`. Questions: `[PRIVACY_EMAIL]`.*
