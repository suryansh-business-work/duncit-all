# Sign in with Apple — Setup

Sign in / sign up with Apple is offered on the mWeb and native login and signup screens. Each
Apple button stays hidden until the values it needs are saved in **Tech portal → Environment
Variables → Sign in with Apple**. Staging and production each keep their own entry, because
each has its own database.

## How each surface signs in

| Surface | How | Token audience | Needs |
| --- | --- | --- | --- |
| iOS app | Apple's native sheet (`expo-apple-authentication`) | App ID (bundle id) | App ID |
| mWeb | Apple JS popup | Services ID | Services ID + mWeb Return URL |
| Android app, native web | Apple web flow → `<server>/apple/callback` → back to `duncit://apple-auth` | Services ID | Services ID + server relay |

The server verifies every Apple id_token against Apple's published keys and accepts the App ID or
the Services ID as the audience. Apple sends the person's name only on the first authorisation.
The apps carry it into signup. If Apple sent no name on this attempt, the details step asks for it.

## Apple Developer console (the four steps Apple lists)

1. **Enable App ID**: Identifiers → App IDs → `com.duncit.mobile` → tick **Sign in with Apple**
   (Enable as a primary App ID).
2. **Create Service ID for Web Authentication**: Identifiers → Services IDs → **+**, e.g.
   `com.duncit.signin`. Tick **Sign in with Apple** → Configure:
   - Primary App ID: `com.duncit.mobile`
   - Domains: `mweb.duncit.com`, `server.duncit.com` (staging: `staging.mweb.duncit.com`,
     `staging.server.duncit.com`)
   - Return URLs:
     - `https://mweb.duncit.com/login`
     - `https://server.duncit.com/apple/callback`
     - staging: `https://staging.mweb.duncit.com/login`,
       `https://staging.server.duncit.com/apple/callback`
3. **Create Key**: Keys → **+** → tick **Sign in with Apple** → Configure → primary App ID
   `com.duncit.mobile`. Download `AuthKey_<KeyID>.p8`. Apple lets you download it only once.
4. **Register Email Sources for Communication**: Services → Sign in with Apple for Email
   Communication → add the domain and the address Duncit sends mail from (the Email (SMTP)
   entry's From Address). Without this, mail sent to Hide My Email relay addresses bounces.

## Tech portal → Environment Variables → Sign in with Apple

| Field | Value |
| --- | --- |
| Team ID | Membership details → Team ID (10 characters) |
| App ID (iOS bundle identifier) | `com.duncit.mobile` |
| Services ID (web client ID) | The Services ID from step 2, e.g. `com.duncit.signin` |
| mWeb Return URL | `https://mweb.duncit.com/login` (staging: `https://staging.mweb.duncit.com/login`) |
| Key ID | The key from step 3 |
| Private Key (.p8) | The whole `.p8` file, BEGIN and END lines included. A paste that loses its line breaks is fine: the server rebuilds the key |

Mark the entry **active + default**, then press **Test**. The test signs a client secret with the
key and asks Apple to redeem a code it never issued. Apple checks the key before the code, so
`invalid_grant` shows as green: the Team ID, Key ID, key and Services ID belong together. Nobody is
signed in.

## Before an App Store release

- The iOS build must be signed with a provisioning profile that includes the Sign in with Apple
  capability. `app.json` already sets `ios.usesAppleSignIn` and the config plugin.
- App Review guideline 5.1.1(v) also requires an account deleted in the app to revoke its Apple
  tokens (Apple's `/auth/revoke`). The key saved above is the credential that call needs. The
  revocation itself is not built yet.
