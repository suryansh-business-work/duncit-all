# Continue with Truecaller — Setup

The Truecaller button is offered on the mWeb and native login and signup screens. Truecaller
proves which phone number the person is holding:

- **Number already on Duncit** → signed in straight away (same checks as OTP login).
- **New number** → signup opens with the name, email and number filled in, and the WhatsApp code
  step is **skipped for that number** (the server hands back the same one-shot proof a WhatsApp
  code earns). If the person changes the number, the normal code step runs.

Every button stays hidden until the values it needs are saved in **Tech portal → Environment
Variables → Truecaller (one-tap phone sign-in)**. Staging and production each keep their own
entry, because each has its own database.

## How each surface signs in

| Surface | How | Server check | Needs |
| --- | --- | --- | --- |
| Android app | Truecaller OAuth SDK 3.x sheet → authorization code + PKCE verifier | Code exchanged at `oauth-account-<region>.truecaller.com/v1/token`, profile from `/v1/userinfo` | Android Client ID |
| iOS app | TrueSDK → profile **signed by Truecaller** (payload + signature) | RSA-SHA512 signature checked against `api4.truecaller.com/v1/key`, ≤10 min old, single use | App Key + iOS App Link |
| mWeb (Android browsers with the Truecaller app) | Deep link `truecallersdk://truesdk/web_verify` → Truecaller POSTs a token to `<server>/truecaller/callback` | Profile fetched from Truecaller with that token (`*.truecaller.com` only) | App Key + Partner name |

mWeb on iPhone/desktop has no Truecaller web flow, so the button is not shown there. Nothing the
client says about the person is trusted. The server re-checks every proof with Truecaller.

## Truecaller developer console

1. Sign in at the [Truecaller SDK console](https://sdk-console-noneu.truecaller.com/) and create a
   project.
2. **Android app**: package `com.duncit.mobile`, plus the SHA-1 of the **release** signing key
   (Play App Signing key for store builds). Copy the **Client ID**.
3. **iOS app**: bundle `com.duncit.mobile`, plus the Apple Team ID. Copy the **App Key** and the
   **App Link** (`https://si….truecallerdevs.com`).
4. **Web (mobile website)**: domain `mweb.duncit.com` (and the staging host). Set the **Callback
   URL** to `https://server.duncit.com/truecaller/callback` (staging:
   `https://staging.server.duncit.com/truecaller/callback`). It must be https.

## Tech portal

**Environment Variables → Add → Truecaller**:

| Field | Value |
| --- | --- |
| Android Client ID (OAuth SDK) | Client ID from step 2 |
| App Key (iOS + mobile web) | App Key from step 3/4 |
| iOS App Link | App Link from step 3 |
| Partner name (mobile web) | `Duncit` (shown on Truecaller's web sheet) |
| Region | `noneu` (India) — blank means noneu |

**Test connection** sends a bogus code to Truecaller's token endpoint as this Client ID. An
unknown client is refused as the client, so a pass proves the ID and region. Nobody is signed in.

## Native builds

Truecaller's SDKs read their identifiers from the **native project** (Android manifest meta-data;
iOS URL scheme `truecallersdk-<AppKey>` and associated domain `applinks:<App Link host>`). So:

- `android-build.yml` / `ios-build.yml` run `scripts/truecaller-build-env.js` before
  `expo prebuild`. It reads the identifiers from the public client config of the server the app is
  built for (the values saved in Tech).
- `plugins/withTruecaller.js` sets the SDK up only for a platform whose identifiers are present,
  and `react-native.config.js` links the native module only then. A build made before Tech is
  configured carries no Truecaller and shows no button.
- **After saving the Tech entry, cut a new app build.** Older binaries never show the button.
- The Android SDK ships Java 21 bytecode. CI already builds on JDK 21, and the plugin raises the
  app's compile options when Truecaller is configured.
- iOS: the App ID already has the Associated Domains capability (for `mweb.duncit.com`). The
  Truecaller domain is one more entry in the same entitlement.

## Verify on staging

1. Android phone with Truecaller signed in → app → Login → Truecaller → consent → signed in (an
   existing number), or signup opens prefilled with the "verified with Truecaller" note.
2. Same on mWeb in Android Chrome. Watch the server log for `auth-truecaller` lines if Truecaller
   never answers. `callback-unmatched` means the Callback URL points at the other environment.
3. iPhone with Truecaller → iOS app → same as 1.
