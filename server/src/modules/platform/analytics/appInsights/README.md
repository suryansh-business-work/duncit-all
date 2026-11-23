# App Insights (Analytics › App Insights)

Google Play Console and App Store Connect statistics for the Duncit apps, synced
into Duncit once a day and read by the Analytics console from here — the stores
are never called while someone is looking at the page.

## Setup (Tech › Environment Variables)

Both stores reuse the entries the store releases already need.

| Store | Entry | Fields App Insights reads |
|---|---|---|
| Google Play | `GOOGLE_PLAY` | Service account key (JSON), package name, **Reports Cloud Storage bucket** (new) |
| App Store | `APP_STORE_CONNECT` | Issuer ID, Key ID, private key (.p8), bundle ID |

Google Play, once:
1. Play Console → **Download reports → Statistics → Copy Cloud Storage URI**
   (`gs://pubsite_prod_rev_…`) and paste it into *Reports Cloud Storage bucket*.
2. Play Console → **Users and permissions** → the service account's email →
   grant **View app information and download bulk reports**.
3. Tech › Environment Variables → Google Play → **Test connection** now also
   checks the bucket.

App Store: the key must have the **Admin** role (it already does for iOS
signing). The first sync creates an ONGOING Analytics Reports request; Apple
publishes the first reports one to two days later.

Until a store is configured its tab shows *configuration required* — never
zeros.

## What is read

| Store | Source | Metrics |
|---|---|---|
| Google Play | Monthly bulk report CSVs (UTF-16) in the bucket: `stats/installs` (overview, country, app_version), `stats/crashes` (overview, app_version), `stats/ratings` (overview), `reviews` | new users, device installs/uninstalls/upgrades, 30-day active devices, total user installs, crashes, ANRs, daily and lifetime rating, reviews per star |
| App Store | Analytics Reports (gzip TSV segments): App Downloads, Installation and Deletion, Sessions, Crashes (Standard) + customer reviews | first-time downloads, redownloads, updates, installations, deletions, sessions, active devices (approximate), crashes, reviews per star |

Store revenue is not synced (Duncit does not sell through store billing).

Each metric keeps its own store's definition (`appInsights.metrics.ts`). The
Overview adds up only like measures — new installs, uninstalls, crashes — and
never active devices or ratings.

## How a sync runs

- `appInsights.scheduler.ts` ticks hourly; a store syncs when its last success
  is a day old (an hour after a failure). **Sync now** (`syncAppInsights`)
  starts one in the background, refused within 5 minutes of the last attempt.
- One store syncs at a time cluster-wide: the `app_insight_states` document is
  the lock (taken by one conditional update, taken over after 30 minutes).
- A report already read is skipped (`app_insight_sources`: GCS object
  generation / Apple instance id). A report that is read replaces exactly the
  metrics it owns over its days (`appInsights.store.ts`), so re-running is safe.
- Calls retry on 429/5xx/dropped connections with Retry-After or 1-2-4 s
  backoff (`appInsights.http.ts`); writes retry only on 429.
- Every run writes an `app_insight_sync_logs` row (kept 90 days) with what it
  read, skipped, wrote, the API calls and retries, and a credential-free reason.

## Access

Every query and the mutation require `SUPER_ADMIN` or `ANALYTICS_MANAGER`,
checked before anything else. The same operations are MCP tools (category
`analytics`) through the generated catalogue.
