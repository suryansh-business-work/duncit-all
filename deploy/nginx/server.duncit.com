# /etc/nginx/sites-available/server.duncit.com
# CORS: allow all. `$http_origin` is echoed back instead of `*` so that
# `Access-Control-Allow-Credentials: true` remains valid (browsers reject
# `*` with credentials). Falls back to `*` when no Origin header is sent
# (server-to-server, curl, mobile webviews).
map $http_origin $cors_allow_origin {
    default  "*";
    "~.+"    $http_origin;
}

# Allow-Credentials must NOT be `true` when Allow-Origin is `*`. Echo the
# correct value depending on whether an Origin header was sent.
map $http_origin $cors_allow_credentials {
    default  "";
    "~.+"    "true";
}

server {
    listen 80;
    listen [::]:80;
    server_name server.duncit.com;

    client_max_body_size 25m;

    # CORS headers are attached `always` so they ride along with 5xx / 502
    # responses too. Without this, when the upstream Node container is
    # restarting, the browser reports the 502 as a "CORS error" and the real
    # status is invisible to the client.
    add_header Access-Control-Allow-Origin      $cors_allow_origin     always;
    add_header Access-Control-Allow-Credentials $cors_allow_credentials always;
    add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD" always;
    add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
    add_header Access-Control-Expose-Headers    "Content-Length, Content-Type, Authorization, X-DUID" always;
    add_header Access-Control-Max-Age           "600"                  always;
    add_header Vary                             "Origin"               always;

    location / {
        # Short-circuit preflight at nginx so it succeeds even if the
        # upstream is briefly down (deploy / restart / crash loop).
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin      $cors_allow_origin     always;
            add_header Access-Control-Allow-Credentials $cors_allow_credentials always;
            add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD" always;
            add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
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

        # Strip any CORS headers Express might emit. nginx owns CORS at the
        # front door; if Express also sends them, the browser sees two values
        # for `Access-Control-Allow-Origin` and rejects with CORS error.
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Expose-Headers;
        proxy_hide_header Access-Control-Max-Age;

        # Excel import/export, AI prefill and audio transcript fetches can
        # take a while — give them headroom before nginx 504s the request.
        proxy_connect_timeout 30s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;

        proxy_buffering         on;
        proxy_buffer_size       16k;
        proxy_buffers           16 16k;
        proxy_busy_buffers_size 64k;
    }

    listen [::]:443 ssl; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/duncit.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/duncit.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# HTTP→HTTPS redirect (also managed by Certbot). Must come after the main
# server block above; otherwise this server would catch requests before they
# reach the TLS listener.
server {
    if ($host = server.duncit.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name server.duncit.com;
    return 404; # managed by Certbot
}
