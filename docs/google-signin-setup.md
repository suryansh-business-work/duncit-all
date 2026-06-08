# Google Sign-In — Setup (Web + Expo Go)

One Google Cloud **Web** OAuth client is shared by mWeb, the Expo **web** target and the
server. The server verifies the Google `id_token` and checks its `aud` equals our
`GOOGLE_CLIENT_ID`, so **every surface must use the same Web client ID**.

## How the redirect works on each surface (read this first)

| Surface | Library | Does it redirect? | Redirect goes to |
| ------- | ------- | ----------------- | ---------------- |
| **mWeb** | Google Identity Services (`@react-oauth/google`) | **No** — popup posts the credential back to the page | nothing (origin only) |
| **Expo web** (`native.duncit.com`, `localhost:2022`) | `expo-auth-session` | **Yes** — browser returns the token to the **page origin** | the frontend page itself |
| **Native device** (Expo Go) | `expo-auth-session` | Yes — to the app | the app (see caveat) |
| **Server** | verifies `id_token` only | **Never** | — |

> The **redirect NEVER points at the backend** (`server.duncit.com`). The server only
> receives the `id_token` over GraphQL and validates it — it takes no part in the OAuth
> redirect. So you never add a server URL anywhere in the Console.

## 1. Google Cloud Console

APIs & Services → **Credentials**.

### a) OAuth consent screen (do this first — your screenshot warned about it)

- User type **External**; app name `Duncit`; support + developer email
- Scopes: `openid`, `email`, `profile`
- Add yourself as a **Test user** while in "Testing" mode

### b) Create credentials → OAuth client ID → **Web application** (`Duncit Web`)

**Authorized JavaScript origins** — the page that starts sign-in:

| Surface          | Origin                      |
| ---------------- | --------------------------- |
| mWeb dev         | `http://localhost:2003`     |
| Expo web dev     | `http://localhost:2022`     |
| mWeb prod        | `https://mweb.duncit.com`   |
| Expo web prod    | `https://native.duncit.com` |

**Authorized redirect URIs** — where Google returns the token. **Frontends only —
never the server:**

| Surface          | Redirect URI                |
| ---------------- | --------------------------- |
| Expo web dev     | `http://localhost:2022`     |
| Expo web prod    | `https://native.duncit.com` |
| mWeb (GIS)       | _none — uses origins above_ |
| Server           | _none — never redirects_    |

> If you ever hit **`redirect_uri_mismatch`**, Google's error page prints the exact
> `redirect_uri` it tried — paste that exact string (it may carry a trailing `/`) into
> the redirect-URIs list. `expo-auth-session` also exposes it as `request.redirectUri`.

### Native device (Expo Go) — caveat

On Expo SDK 54 the Expo auth proxy is gone, so a **Web** client cannot complete Google
sign-in on a **physical device in Expo Go** (Google rejects the `exp://` redirect, and
Web clients don't allow custom schemes). Today's setup works for **mWeb + Expo web**.
To support the installed app, create separate **iOS** and **Android** OAuth clients in a
dev/EAS build and let the server accept those audiences too — that's the deferred
"Web + native standalone" option.

## 2. Where the client ID goes — the Tech portal is the single source

The frontends fetch the public client config (`google_client_id` + `google_maps_api_key`)
from the server at startup via the unauthenticated **`publicClientConfig`** query. The
server resolves it from the **Tech portal**, so you set it in **one place**:

| Set in | Field |
| ------ | ----- |
| Tech portal → **Env → GOOGLE_OAUTH** | Client ID (+ Client Secret) → feeds the server's `aud` check **and** mWeb/native via `publicClientConfig` |
| Tech portal → **Env → GOOGLE_MAPS** | Maps API key → feeds the map embeds |

Make the GOOGLE_OAUTH entry **active + default** so `getRuntimeEnvValue` picks it up.

> **Bundled env is a fallback only.** `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_MAP_API`
> (mWeb) and `EXPO_PUBLIC_GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_MAP_API` (native) are
> used only for local dev / offline before the server responds. The server value wins
> whenever it is non-empty, so production reads everything from the Tech portal.

## 3. Verify end-to-end

1. **mWeb** (`localhost:2003` / `mweb.duncit.com`): "Sign in with Google" shows the
   Google logo (once `VITE_GOOGLE_CLIENT_ID` is set), the popup completes, you land
   signed in. No redirect occurs.
2. **Expo web** (`localhost:2022` / `native.duncit.com`): the button redirects to Google
   and back to the page origin, then you're signed in.
3. **Server**: no `Google sign-in is not configured` or `audience mismatch` in logs —
   both mean the client IDs don't all match the one Web client.
