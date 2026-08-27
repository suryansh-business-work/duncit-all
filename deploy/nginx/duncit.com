# /etc/nginx/sites-available/duncit.com
#
# SINGLE source of truth for every Duncit vhost. The deploy workflow installs
# ONLY this file into sites-available/enabled (no per-subdomain files) and then
# runs `certbot --nginx --cert-name duncit.com` which patches each server block
# below with its 443 listener + HTTP->HTTPS redirect in place. Do not add the
# Certbot-managed `listen 443 ssl` lines here — they are generated on the host.


server {
    listen 80;
    listen [::]:80;
    server_name duncit.com www.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

# --- API: server.duncit.com (GraphQL/Node on :2001) --------------------------
# CORS: echo the Origin back (not "*") so Allow-Credentials: true stays valid.
map $http_origin $cors_allow_origin {
    default  "*";
    "~.+"    $http_origin;
}
map $http_origin $cors_allow_credentials {
    default  "";
    "~.+"    "true";
}

server {
    listen 80;
    listen [::]:80;
    server_name server.duncit.com;

    client_max_body_size 25m;

    add_header Access-Control-Allow-Origin      $cors_allow_origin     always;
    add_header Access-Control-Allow-Credentials $cors_allow_credentials always;
    add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD" always;
    add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-No-Redis, X-Duncit-Surface, X-Duncit-App, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
    add_header Access-Control-Expose-Headers    "Content-Length, Content-Type, Authorization, X-DUID, X-Redis-Cache" always;
    add_header Access-Control-Max-Age           "600"                  always;
    add_header Vary                             "Origin"               always;

    # CI build artifacts, served straight off disk — nginx does this far better
    # than Node, and the file is already on this host.
    #
    # ImageKit is not an option for these: it refuses any upload over 20 MiB
    # ("The file size exceeds 20971520 bytes limit"), which a release APK always
    # exceeds. The server writes them to /opt/duncit/app-builds instead.
    #
    # The headers are the point. An .ipa IS a zip, and a store that content-sniffs
    # serves it as application/zip — so the browser saves "…ipa" as a .zip and the
    # file is useless. Forcing octet-stream plus an attachment disposition makes
    # every artifact download under its own name and extension.
    location /app-builds/ {
        alias /opt/duncit/app-builds/;
        default_type application/octet-stream;
        types { }
        add_header Content-Disposition "attachment" always;
        add_header X-Content-Type-Options "nosniff" always;
        # Immutable: the stored name carries a random prefix, so a given URL is
        # always the same bytes.
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        autoindex off;
    }

    # Files on their way to their store — pod media from the apps to ImageKit,
    # and a 60–150 MB APK/IPA from the android-build / ios-build workflows to the
    # directory above. The 25m server-level cap is sized for a GraphQL document
    # and would 413 every build artifact, so this one route gets its own ceiling.
    #
    # proxy_request_buffering is off so nginx streams the body straight through to
    # Node rather than spooling the whole file to its own disk first. The server
    # already spools it once (see upload.router.ts); doing it twice doubles the
    # latency and the disk churn and buys nothing.
    location /upload {
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin      $cors_allow_origin     always;
            add_header Access-Control-Allow-Credentials $cors_allow_credentials always;
            add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD" always;
            add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-No-Redis, X-Duncit-Surface, X-Duncit-App, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
            add_header Access-Control-Max-Age           "600"                  always;
            add_header Vary                             "Origin"               always;
            add_header Content-Length 0;
            add_header Content-Type "text/plain; charset=utf-8";
            return 204;
        }

        client_max_body_size    300m;
        proxy_request_buffering off;

        proxy_pass         http://127.0.0.1:2001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Expose-Headers;
        proxy_hide_header Access-Control-Max-Age;

        # One request covers both legs: the client's upload to us AND our upload
        # to ImageKit. For 150 MB over a CI runner's link that is minutes.
        proxy_connect_timeout 60s;
        proxy_send_timeout    900s;
        proxy_read_timeout    900s;
        send_timeout          900s;
    }

    location / {
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin      $cors_allow_origin     always;
            add_header Access-Control-Allow-Credentials $cors_allow_credentials always;
            add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD" always;
            add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-No-Redis, X-Duncit-Surface, X-Duncit-App, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
            add_header Access-Control-Max-Age           "600"                  always;
            add_header Vary                             "Origin"               always;
            add_header Content-Length 0;
            add_header Content-Type "text/plain; charset=utf-8";
            return 204;
        }

        proxy_pass         http://127.0.0.1:2001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";

        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Expose-Headers;
        proxy_hide_header Access-Control-Max-Age;

        # Timeouts sized for the API, not for a static site. A checkout mutation
        # can legitimately run for minutes (invoice PDF, ShipRocket, coin
        # settlement); cutting it off mid-flight leaves money captured at the
        # gateway with no booking behind it. send_timeout covers the client leg
        # that proxy_send_timeout does not. The Node process is pinned to match
        # these — see httpServer.requestTimeout in server/src/index.ts.
        proxy_connect_timeout 60s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
        send_timeout          300s;

        proxy_buffering         on;
        proxy_buffer_size       16k;
        proxy_buffers           16 16k;
        proxy_busy_buffers_size 64k;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name admin.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2002;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name mweb.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2003;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name partners.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2004;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name partners-app.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2005;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ads.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2020;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ads-portal.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2006;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name crm.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2007;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name finance.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2008;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name tech.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2009;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name support.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2010;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name website.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2011;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name legal.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2012;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ai.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2013;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name products.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2014;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name marketing.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2015;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name onboarding.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2016;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name hr.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2017;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name employee.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2018;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name status.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2019;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

# --- SignOz (self-hosted observability UI on :2021) --------------------------
# Runs from its own compose stack at /opt/signoz on the host (NOT part of the
# duncit docker-compose). Larger body + longer timeouts for the query API and
# websocket headers for live tail / streaming views.
server {
    listen 80;
    listen [::]:80;
    server_name signoz.duncit.com;
    client_max_body_size 50m;

    # OTLP HTTP ingestion (logs/traces/metrics) → collector. Lets external
    # senders ship to https://signoz.duncit.com over the existing TLS, with no
    # extra public port. The UI is served by `location /` below.
    location ~ ^/v1/(logs|traces|metrics)$ {
        # Optional ingestion-key guard. The key lives in a server-only snippet
        # (/etc/nginx/signoz-otlp-auth.conf, NOT in the repo); the wildcard means
        # nginx -t still passes if the snippet is absent (guard simply off).
        # Senders pass header `signoz-ingestion-key`. The in-cluster server uses
        # the internal collector and bypasses this path entirely.
        include /etc/nginx/signoz-otlp-auth*.conf;
        proxy_pass         http://127.0.0.1:4318;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        client_max_body_size 50m;
        proxy_read_timeout 30s;
    }

    location / {
        proxy_pass         http://127.0.0.1:2021;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_connect_timeout 30s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}

# --- Native Web: native.duncit.com (Expo web export on :2022) -----------------
server {
    listen 80;
    listen [::]:80;
    server_name native.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2022;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

# --- SonarQube (self-hosted code quality on :2023) ---------------------------
# Runs from its own compose stack at /opt/sonarqube on the host (NOT part of the
# duncit docker-compose). Large body for analysis report uploads + long timeouts.
server {
    listen 80;
    listen [::]:80;
    server_name sonarqube.duncit.com;
    client_max_body_size 100m;

    location / {
        proxy_pass         http://127.0.0.1:2023;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_connect_timeout 30s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}

# --- Earn with Duncit: earnwith.duncit.com (Astro marketing site on :2025) ----
server {
    listen 80;
    listen [::]:80;
    server_name earnwith.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2025;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

# --- Challenges console: challenge.duncit.com (SPA on :2026) ------------------
server {
    listen 80;
    listen [::]:80;
    server_name challenge.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2026;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

# --- Developers console: developers.duncit.com (SPA on :2027) -----------------
server {
    listen 80;
    listen [::]:80;
    server_name developers.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2027;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}

# --- OpenWA gateway: open-wa-server.duncit.com (NestJS + WhatsApp on :2024) ---
# The CRM "WhatsApp Lead Generator" gateway (portals/crm/open-wa-server). Serves
# the bundled dashboard + REST API + live QR/session WebSocket. Larger body for
# media; long read timeout so the QR/session stream stays open.
server {
    listen 80;
    listen [::]:80;
    server_name open-wa-server.duncit.com;
    client_max_body_size 50m;

    location / {
        proxy_pass         http://127.0.0.1:2024;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_connect_timeout 30s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}

# --- Redis UI: redis.duncit.com (Redis Commander on :2028) --------------------
# Window into the server's GraphQL response cache (duncit-redis / duncit-redis-ui
# in the duncit compose stack). ALWAYS behind basic auth: the cache holds real
# API responses, so this must never be publicly readable. The htpasswd file is
# created once on the VPS (see README "Redis") and survives deploys.
server {
    listen 80;
    listen [::]:80;
    server_name redis.duncit.com;
    client_max_body_size 5m;

    location / {
        auth_basic           "Duncit Redis";
        auth_basic_user_file /etc/nginx/.htpasswd-redis;

        proxy_pass         http://127.0.0.1:2028;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 90s;
    }
}
