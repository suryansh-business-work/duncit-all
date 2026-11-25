# Duncit CRM (Android and iPhone)

The CRM portal on an internal employee's phone. On Android it adds a dialer,
caller ID and automatic call logging; on an iPhone the dialer opens the phone's
own dialer and the call features are left out. Same backend and same sign-in as the CRM portal
(`portals/crm`); a separate project from the member app (`app/mobile-app`) that
follows its coding standards.

## Run it

```bash
cd app/crm-app
npm install
npm run codegen          # typed GraphQL operations from the server schema
npm run android          # needs a device/emulator; the phone features need a real phone
npm test                 # jest, 85% coverage gate
npm run typecheck && npm run lint
```

`EXPO_PUBLIC_API_URL` picks the server (CI: staging branch → staging, main → production).

## What it does

| Area | How |
| --- | --- |
| Sign-in | The portal's console login (`portal_key: crm`) → two-step code → Security Verification (consents + location, or an administrator-approved alternative). CRM_MANAGER / SUPER_ADMIN only, re-checked on every launch. |
| Leads | One search across venue, host, ecomm, creator and community leads (`searchCrmLeads`); lead detail with contacts, notes, the communication log (recordings, transcripts, AI summaries) and reminders. |
| Notes & reminders | The portal's manual logs (`addCrmManualLog`) and reminders (`createCrmReminder`, `toggleCrmReminderDone`). |
| Dialer | Keypad + instant "who is this" from the CRM; places a normal SIM call. Also opens from the home-screen widget, the pinned Dialer icon (Settings → Add dialer icon to home screen), the long-press shortcut, and any tapped `tel:` link. |
| Caller ID | When a CRM contact rings, a card shows over the call screen (or as a heads-up notification): lead, contact, status, city, assignee. Matched against an offline directory, so it works with no signal and the app closed. |
| Call logging | Calls with CRM contacts are sent to the lead's communication log (`logCrmDeviceCall`, idempotent per call), with the phone's own recording attached (`attachCrmDeviceCallRecording`); the server transcribes it (Sarvam) and writes the AI summary. |
| After a call | "Call ended — add a note" notification → the post-call screen: note, follow-up reminder, open the lead. |

## Privacy and platform limits

- **Personal calls never leave the phone.** A call is matched against the
  on-device CRM directory; any other number is skipped on the phone and is
  never sent, not even for a lookup. Logging starts when it is switched on.
- **The app never records calls.** Android 10+ blocks third-party call
  recording. The app attaches the file the phone's *built-in* call recorder
  saved (Samsung, Xiaomi, OnePlus, Vivo… — turn recording on in the phone's
  dialer). Phones whose recorder keeps files private (e.g. Google Phone)
  produce no attachable recording; the call is still logged.
- **Call features are Android only.** iOS does not let apps read the call log
  or screen calls, so `modules/crm-telephony` has no iOS side and the iPhone
  app (`hasPhoneFeatures()` false) hides caller ID, call logging, the Android
  permissions, the home-screen icon and the background sync. Leads, reminders,
  the dialer (through the phone's own dialer) and the recorded CRM call line
  work the same on both.
- Sign-out wipes the token, the directory, the sync state, the shortcuts and the widget's labels.

## Layout

```
modules/crm-telephony/   Kotlin (Expo local module): call receiver, caller card overlay,
                         notifications, call log + recordings reader, directory file,
                         widget, shortcuts. Decisions live in TypeScript; this only reads/writes.
src/features/calls/      Pure rules: which calls are logged, which file is a call's recording.
src/services/            GraphQL client, session, call sync, directory sync, background task, upload.
src/screens/             Tamagui screens; every one wrapped in an error boundary.
src/forms/               React Hook Form + Zod (.form.tsx / .types.ts / index.tsx).
```

Copy is server-first (`crmApp.*`, plus the portal's `crm.*` and
`shell.securityVerification.*`) with `packages/i18n/src/bundles/crm-app.ts` as
the local fallback. The words the Android side draws are translated by the app
and written next to the directory file.

## Release

`.github/workflows/crm-android-build.yml` builds a signed APK and AAB, and
`.github/workflows/crm-ios-build.yml` an App Store-signed IPA, on every push to
`staging` and `main` that touches the app. Both record the build (app `CRM`,
Tech → App Builds → Duncit CRM Android / Duncit CRM iOS) and announce it on
Slack (Tech → Environment → Slack → "Duncit CRM App Builds Channel"). Staff
download them from the CRM portal: sidebar → **Download CRM App**.

The IPA is signed with the member app's Apple Distribution certificate and an
App Store profile the server makes for the CRM bundle ID, which must be set on
production's Tech → Environment → App Store Connect → Duncit CRM Bundle ID
(signing always comes from production, where the member app signs too; until
it is set up, a push skips the iOS build with a warning). An App
Store-signed IPA installs only through TestFlight: create the "Duncit CRM" app
once in App Store Connect, then dispatch `crm-ios-build.yml` with
`submit_to_app_store` and add staff as TestFlight testers. The iOS build uses
Xcode 26 because the app has not adopted the UIScene life cycle that the iOS 27
SDK requires; it must move to Xcode 27 before April 2027.

Parity rule: whatever the CRM portal can do, this app must do too (see
`.claude/CLAUDE.md`, Project Specific #10).
