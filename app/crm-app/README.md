# Duncit CRM (Android)

The CRM portal on an internal employee's Android phone, plus a dialer, caller
ID and automatic call logging. Same backend and same sign-in as the CRM portal
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
- **Android only.** iOS does not let apps read the call log or screen calls.
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

`.github/workflows/crm-android-build.yml` builds a signed APK on every push to
`staging` and `main`, records it (app `CRM`) and announces it on Slack (Tech →
Environment → Slack → "Duncit CRM App Builds Channel"). Staff download it from
the CRM portal: sidebar → **Download CRM App**.

Parity rule: whatever the CRM portal can do, this app must do too (see
`.claude/CLAUDE.md`, Project Specific #10).
