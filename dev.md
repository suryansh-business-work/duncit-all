# dev.md

Operational notes for things that live on the VPS rather than in this
repository — the steps the deploy workflow does **not** perform, and how to
verify them.

---

## Deployment

### The VPS

| | |
|---|---|
| Host | Hostinger KVM4, `148.135.136.107` (`srv912221`) |
| OS | Ubuntu 25.04 (plucky) |
| Access | `ssh root@148.135.136.107` — credentials are **not** in this repo, ask an admin |
| Production stack | `/opt/duncit`, containers `duncit-*`, host ports 2000–2027 |
| Staging stack | `/opt/duncit-staging`, containers `duncit-staging-*`, host ports = production + 100 |
| Reverse proxy | nginx, `/etc/nginx/sites-available/duncit.com` (+ `staging.duncit.com`) |
| TLS | Let's Encrypt, `/etc/letsencrypt/live/duncit.com` — one certificate covering every subdomain |

Everything above is driven by `.github/workflows/deploy.yml`. Pushing `staging`
deploys the staging stack; merging `staging` → `main` deploys production. Nothing
in this section needs doing on a normal release.

### apt is pinned to a dead mirror

`apt-get update` fails on this host: `repos.del.extreme-ix.org` no longer serves
`plucky`, and Ubuntu 25.04 is past its end of life. To install a package, move
the broken mirror list aside for the duration and let the official archive answer:

```sh
mv /etc/apt/sources.list.d/ubuntu-mirrors.list /root/ubuntu-mirrors.list.bak
apt-get update -qq
apt-get install -y --no-install-recommends <package>
mv /root/ubuntu-mirrors.list.bak /etc/apt/sources.list.d/ubuntu-mirrors.list
```

Restore the file in the same command. Leaving it out changes which mirror every
future update reads from, which is not a decision an unrelated install should make.

---

## Opening an mWeb link in the app

Tapping `https://mweb.duncit.com/club/x/pod/y` on a phone with the app installed
should open the app **on that pod**, not the browser. Nothing in JavaScript can
do that: by the time a page runs, the browser has already won. The OS has to
recognise the domain as belonging to the app and hand the URL over before any
page loads.

Most of it was already in place and had been for a while:

- the app declares an intent filter for `mweb.duncit.com` with `autoVerify`
  (`app/mobile-app/app.json`), and
- its router mirrors mWeb's URL grammar exactly
  (`app/mobile-app/src/navigation/linking.ts`), so once the URL arrives it
  lands on the same screen.

**What was missing is the association files.** Android fetches
`/.well-known/assetlinks.json` and looks for the app's signing fingerprint;
iOS fetches `/.well-known/apple-app-site-association`. mWeb answered both with
`index.html`, because an SPA answers every path with `index.html` —
`Content-Type: text/html`, which the verifier rejects. The intent filter was
inert, and Android caches that failure.

### How they are produced

`scripts/generate-app-links.mjs` writes both files into
`app/mweb/public/.well-known/` during `pnpm --filter mweb-app build`. The
package name and bundle id come from `app.json` so they cannot drift from the
app; the signing identity comes from the environment:

| Variable | Where to find it |
|---|---|
| `MWEB_ANDROID_CERT_SHA256` | Play Console → your app → **Test and release ▸ Setup ▸ App signing** → *App signing key certificate* → SHA-256. Include the **upload** key's SHA-256 too, comma separated, or internal-testing builds will not verify. |
| `MWEB_IOS_TEAM_ID` | Apple Developer → **Membership** → Team ID (10 characters). |

Both are passed to the image as build args by `.github/workflows/deploy.yml`,
from repository secrets of the same names. **They are not committed**, and the
generated directory is gitignored — a fingerprint belongs to a signing key, and
a stale one is worse than none because Android remembers the failure.

If a variable is unset the file is not written and the build says so. That is
deliberate: no file at all is a clean "not configured", while a placeholder is a
verification failure the phone caches.

`deploy/nginx/spa.conf` serves `/.well-known/` ahead of the SPA fallback, as
`application/json` — `apple-app-site-association` has no file extension, so
nginx would otherwise send `application/octet-stream` and iOS would ignore it.

### Turning it on

1. Add the two repository secrets above.
2. Deploy mWeb.
3. Check what the phone will see:

   ```sh
   curl -i https://mweb.duncit.com/.well-known/assetlinks.json
   curl -i https://mweb.duncit.com/.well-known/apple-app-site-association
   ```

   Both must return the JSON with `Content-Type: application/json`. HTML here
   means the SPA fallback is still winning and nothing else will work.
4. Confirm Android accepts it:
   <https://developers.google.com/digital-asset-links/tools/generator>, or on a
   device `adb shell pm get-app-links com.duncit.mobile` — the domain should
   read `verified`.
5. **The app must be rebuilt and published** for iOS: `associatedDomains` is
   compiled into the binary, so an existing TestFlight/App Store build will not
   pick this up.

Verification is not instant. Android re-checks on install and periodically;
allow up to a day, and reinstall to force it.

### When the OS does not hand it over

Some contexts never will — an in-app browser (Instagram, Gmail), a user who
once chose "open in browser", or a phone without the app. `OpenInAppBanner`
covers those with an explicit button: on iOS the `duncit://` scheme, on Android
an `intent://` URL carrying `S.browser_fallback_url`. The intent form matters —
a bare scheme that nothing handles leaves Chrome on an error page, while an
intent that nothing handles falls back cleanly, and it works during the day or
so before verification completes.

Staging is not covered: the app's intent filter names `mweb.duncit.com` only, so
`staging.mweb.duncit.com` links stay in the browser by design.

---

## Staff calls: the TURN relay

### Why it exists

Staff chat's audio and video go **browser to browser**. The server only forwards
the offer, the answer and the ICE candidates — that is why a call costs no
bandwidth here, and why a call can fail while every other feature works.

Finding each other needs STUN, which is free and public. *Reaching* each other
needs a direct path, and two people on different office or home networks usually
do not have one. A TURN relay carries the media in that case.

This is exactly why calls behave perfectly in development and fail in
production: two tabs on one machine can always reach each other.

**What was ruled out first** (both were checked, both were fine):

- **WebSocket / `wss:`** — already working. `nginx` passes `Upgrade` and
  `Connection` through on `server.duncit.com`, and a handshake returns
  `101 Switching Protocols`. Verify any time with:

  ```sh
  curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
    "https://server.duncit.com/socket.io/?EIO=4&transport=websocket"
  ```

- **DNS** — nothing to add. The relay answers on `server.duncit.com`, which
  already resolves to this host and is already on the certificate.

### What is installed

`coturn` 4.6.1, as a systemd service, configured in `/etc/turnserver.conf`.

| | |
|---|---|
| Plain STUN/TURN | UDP + TCP `3478` |
| TURN over TLS | TCP `5349`, using the `duncit.com` Let's Encrypt certificate |
| Relay port range | UDP `49160–49260` |
| Auth | long-term credentials, user `duncit` |
| Bound to | `148.135.136.107` only — **not** `0.0.0.0` |

Two details are load-bearing:

- **It binds to the public IP, not to everything.** This host runs sixteen
  docker bridge networks. A relay listening on those is reachable from inside
  any container.
- **Every private range is a denied peer.** A TURN server whose peers are
  unrestricted is a proxy into every network it can see, including those docker
  bridges and the cloud metadata endpoint. The `denied-peer-ip` lines in the
  config are not decoration.

The relay password was generated on the box and written to `/root/.turn-credentials`
(mode 600). It is not in this repository and must not be.

### Certificates

coturn drops privileges to the `turnserver` user, which cannot read
`/etc/letsencrypt`. It gets its own copy at `/etc/coturn/certs`, refreshed by a
certbot deploy hook at `/etc/letsencrypt/renewal-hooks/deploy/coturn.sh`.

Without that hook the copy goes stale at the next renewal and `turns:` starts
failing with an expired certificate — **silently**, because plain TURN on 3478
carries on working.

### Wiring it to the application

The browser does not have these credentials compiled in. It asks the server for
them at load time (`staffCallIceServers`), and the server reads them from the
**Tech portal**, like every other service credential in this platform.

**Every database needs its own entry.** Staging and production run the same code
against *separate* databases (`duncit-staging` and the URI default), so an entry
created in one is invisible to the other. That asymmetry is how "I configured it
and calls still fail" happens — the portal was showing a perfectly good entry,
for the other environment.

Use the script rather than the portal, so both get the identical value:

```sh
docker cp server/scripts/seed-turn-credentials.mjs <container>:/app/server/seed-turn.mjs

. /root/.turn-credentials
URLS="turn:server.duncit.com:3478,turn:148.135.136.107:3478,turns:server.duncit.com:5349"

for C in duncit-server duncit-staging-server; do
  docker exec -e TURN_URLS="$URLS" -e TURN_USERNAME=duncit \
    -e TURN_CREDENTIAL="$TURN_PASSWORD" "$C" node /app/server/seed-turn.mjs
done
```

It reads the container's own `MONGO_URI`/`MONGO_DB_NAME`, so each run lands in
the right database without anyone choosing. Add `--dry-run` to see what it would
write. It is idempotent — a rotated credential updates the same entry rather
than adding a second one — and it demotes any other default, because the server
reads the one entry that is both active and default.

`TURN_ENTRY_NAME` targets an entry created by hand in the Tech portal, so the
script updates it instead of creating a duplicate beside it.

The same entry is editable at <https://tech.duncit.com> → **Environment** →
**TURN relay (staff calls)**, and staging's at
<https://staging.tech.duncit.com>. Until an entry exists the server serves
public STUN alone, which is the behaviour that was failing. There is nothing to
restart: the value is read per request.

**Why the raw IP is in `urls`.** Browser tests showed
`701 TURN host lookup received error` against `server.duncit.com` before ICE
recovered; with the IP form present the relay answers immediately. Plain TURN
does not validate certificates, so an IP is fine there — `turns:` keeps the
hostname because TLS needs it.

### Verifying it

Three checks, in the order that isolates a failure. Run the first two from a
machine that is **not** the VPS.

**1. Is the port reachable from the internet?** A STUN binding request that
comes back with your own public address proves the whole path — host firewall
and the provider's:

```sh
node scripts/stun-probe.mjs   # TURN_HOST=148.135.136.107
```

**2. Are the TCP ports open?** `3478` and `5349` should both connect.

**2b. Did a browser reach it?** coturn logs every allocation now — without
`verbose` a working relay and an unreachable one produce identical logs, which
is how a diagnosis goes in circles:

```sh
journalctl -u coturn --since "10 min ago" | grep "ALLOCATE processed"
```

**3. Does the relay actually allocate?** On the VPS, with the credentials:

```sh
. /root/.turn-credentials
turnutils_uclient -y -u duncit -w "$TURN_PASSWORD" -n 2 \
  -e 148.135.136.107 148.135.136.107
```

A working relay finishes with `Total lost packets 0 (0.000000%)`. Anything else
— an auth failure, no allocation — means the credentials or the relay range are
wrong, not the network.

**4. In the browser.** Open a call and check `chrome://webrtc-internals`: the
selected candidate pair should be `relay` when the two people are on different
networks. `host`/`srflx` means it did not need the relay, which is also fine.

### If calls still fail

The call window now says why instead of failing silently:

| What the window says | What it means |
|---|---|
| "This browser will not open the microphone or camera here" | Not a secure context — the page is on plain `http:` |
| "The connection dropped. Neither side could reach the other" | ICE failed: no relay configured, or the relay is unreachable |
| A message naming a device | The browser refused or could not open that camera/microphone |

A call that ends the moment it is answered is a different problem: the server
schedules a call's end six seconds after a browser disconnects, and a browser
that is still on the call cancels that by sending `call_resume` when its socket
reconnects. Before that grace period existed, any momentary reconnect behind the
proxy hung up on both sides — which never happened on localhost, where the
socket does not blink.
