# Duncit Mobile

Production-ready React Native app built with **Expo SDK 52**, **TypeScript**, **Expo Router**,
**NativeWind**, **TanStack Query**, **React Hook Form + Zod**, and a full Jest / Detox / CI pipeline.

> This package is **standalone** (npm-based) and intentionally **not** part of the root
> `pnpm-workspace.yaml`. Metro/React Native do not work well with pnpm's symlinked
> `node_modules`, so install and run it from inside this folder.

## Ports

| Purpose         | Port   |
| --------------- | ------ |
| Backend API     | `2020` |
| Expo dev server | `2022` |

`EXPO_PUBLIC_API_URL` defaults to `http://localhost:2020`. The `start`/`android`/`ios`/`web`
scripts launch Expo on port `2022`.

## Getting started

```bash
cd duncit-mobile-app
cp .env.example .env      # set EXPO_PUBLIC_API_URL
npm install
npm run start             # Expo dev server on :2022
```

## Project structure

```text
src/
├── app/            # Expo Router screens (_layout, index)
├── components/     # PrimaryButton, ScreenContainer, LoadingIndicator, LocationPanel
├── hooks/          # useLocation (TanStack Query orchestration)
├── services/       # api.client, location.service, notifications.service, query-client
├── store/          # local device state (useLocationStore)
├── types/          # Zod schemas + inferred types
├── constants/      # config sourced from env vars
├── utils/          # error helpers, test utils
└── assets/         # icons / splash / notification assets
e2e/                # Detox specs + config
scripts/            # Slack upload utility
.github/workflows/  # mobile.yml CI/CD
```

## Scripts

| Command                              | Description                     |
| ------------------------------------ | ------------------------------- |
| `npm run start`                      | Expo dev server (port 2022)     |
| `npm run android` / `ios` / `web`    | Platform targets                |
| `npm run lint` / `lint:fix`          | ESLint                          |
| `npm run format`                     | Prettier                        |
| `npm run typecheck`                  | `tsc --noEmit`                  |
| `npm run test` / `test:coverage`     | Jest unit tests (90% threshold) |
| `npm run e2e:build` / `e2e:test`     | Detox build + run               |
| `npm run build:android:apk` / `:aab` | EAS Android builds              |
| `npm run build:ios`                  | EAS iOS build                   |
| `npm run upload:slack`               | Upload an artefact to Slack     |
| `npm run ci`                         | lint + typecheck + coverage     |

## Location feature

`Get Current Location` requests permission via `expo-location`, fetches coordinates, and stores
them. `Send Location` POSTs `{ latitude, longitude }` to `POST /api/location`. Permission status,
coordinates, loading, API response, and errors are all rendered on the home screen.

## CI/CD

`.github/workflows/mobile.yml` runs: **quality** (lint → typecheck → coverage) → **e2e** (Detox on
an Android emulator, non-blocking) → **android** (APK + AAB → Slack) → **ios** (EAS cloud build →
download IPA → Slack).

> **Monorepo note:** GitHub Actions only reads workflows from the repository root
> `.github/workflows/`. If this app stays inside the `duncit.com` monorepo, move
> `duncit-mobile-app/.github/workflows/mobile.yml` to the repo root and add a
> `paths: ['duncit-mobile-app/**']` filter plus `defaults.run.working-directory: duncit-mobile-app`.
> If you split this folder into its own repository, it works as-is.

## Required GitHub Action secrets

| Secret                | Used by      | Notes                                             |
| --------------------- | ------------ | ------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | all jobs     | Public API base URL baked into the build.         |
| `SLACK_BOT_TOKEN`     | android, ios | Slack bot token (`files:write`, `chat:write`).    |
| `SLACK_CHANNEL_ID`    | android, ios | Target Slack channel id.                          |
| `EXPO_TOKEN`          | ios          | Expo access token for non-interactive EAS builds. |
| `APPLE_ID`            | ios          | Apple ID for EAS iOS signing.                     |
| `APPLE_TEAM_ID`       | ios          | Apple developer team id.                          |

Android signing for release builds also requires a keystore (configure via EAS credentials or a
`gradle.properties` secret) before the `assembleRelease`/`bundleRelease` steps will sign.
