# /etc/nginx/sites-available/staging.duncit.com
#
# Staging twin of deploy/nginx/duncit.com — one server block per
# staging.<sub>.duncit.com vhost, proxying to the duncit-staging compose stack
# (host ports = production + 100, loopback-only). Installed by the deploy
# workflow on pushes to the `staging` branch; `certbot --nginx --cert-name
# staging.duncit.com` patches in the 443 listeners on the host. Do not add the
# Certbot-managed `listen 443 ssl` lines here — they are generated on the host.
#
# signoz/sonarqube have no staging replica, so they have no block here.

server {
    listen 80;
    listen [::]:80;
    server_name staging.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2100;
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

# --- API: staging.server.duncit.com (GraphQL/Node on :2101) -------------------
# CORS: echo the Origin back (not "*") so Allow-Credentials: true stays valid.
# Map output variables are namespaced *_staging_* so they can't collide with the
# production vhost's maps (both files live in the same nginx http context).
map $http_origin $staging_cors_allow_origin {
    default  "*";
    "~.+"    $http_origin;
}
map $http_origin $staging_cors_allow_credentials {
    default  "";
    "~.+"    "true";
}

server {
    listen 80;
    listen [::]:80;
    server_name staging.server.duncit.com;

    client_max_body_size 25m;

    add_header Access-Control-Allow-Origin      $staging_cors_allow_origin     always;
    add_header Access-Control-Allow-Credentials $staging_cors_allow_credentials always;
    add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD" always;
    add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
    add_header Access-Control-Expose-Headers    "Content-Length, Content-Type, Authorization, X-DUID" always;
    add_header Access-Control-Max-Age           "600"                  always;
    add_header Vary                             "Origin"               always;

    location / {
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin      $staging_cors_allow_origin     always;
            add_header Access-Control-Allow-Credentials $staging_cors_allow_credentials always;
            add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD" always;
            add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
            add_header Access-Control-Max-Age           "600"                  always;
            add_header Vary                             "Origin"               always;
            add_header Content-Length 0;
            add_header Content-Type "text/plain; charset=utf-8";
            return 204;
        }

        proxy_pass         http://127.0.0.1:2101;
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

        proxy_connect_timeout 30s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;

        proxy_buffering         on;
        proxy_buffer_size       16k;
        proxy_buffers           16 16k;
        proxy_busy_buffers_size 64k;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name staging.admin.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2102;
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
    server_name staging.mweb.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2103;
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
    server_name staging.partners.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2104;
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
    server_name staging.partners-app.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2105;
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
    server_name staging.ads.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2120;
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
    server_name staging.ads-portal.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2106;
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
    server_name staging.crm.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2107;
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
    server_name staging.finance.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2108;
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
    server_name staging.tech.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2109;
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
    server_name staging.support.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2110;
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
    server_name staging.website.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2111;
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
    server_name staging.legal.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2112;
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
    server_name staging.ai.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2113;
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
    server_name staging.products.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2114;
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
    server_name staging.marketing.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2115;
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
    server_name staging.onboarding.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2116;
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
    server_name staging.hr.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2117;
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
    server_name staging.employee.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2118;
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
    server_name staging.status.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2119;
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
    server_name staging.native.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2122;
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
    server_name staging.earnwith.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2125;
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
    server_name staging.challenge.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2126;
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
    server_name staging.developers.duncit.com;
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:2127;
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

# --- OpenWA gateway: staging.open-wa-server.duncit.com (NestJS on :2124) ------
# Staging twin of the CRM WhatsApp gateway. Larger body for media; long read
# timeout so the QR/session stream stays open.
server {
    listen 80;
    listen [::]:80;
    server_name staging.open-wa-server.duncit.com;
    client_max_body_size 50m;

    location / {
        proxy_pass         http://127.0.0.1:2124;
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
