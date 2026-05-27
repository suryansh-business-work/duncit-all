# /etc/nginx/sites-available/server.duncit.com
# Reflect only trusted Duncit origins + localhost back. `$cors_allow_origin`
# is empty for everything else, which makes browsers reject the response —
# exactly the behaviour we want from a public CORS endpoint.
map $http_origin $cors_allow_origin {
    default                                              "";
    "~^https?://(localhost|127\.0\.0\.1)(:\d+)?$"        $http_origin;
    "~^https://([a-z0-9-]+\.)?duncit\.com$"              $http_origin;
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
    add_header Access-Control-Allow-Origin      $cors_allow_origin always;
    add_header Access-Control-Allow-Credentials "true"             always;
    add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH" always;
    add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-DUID" always;
    add_header Access-Control-Expose-Headers    "Content-Length, Content-Type" always;
    add_header Access-Control-Max-Age           "600"              always;
    add_header Vary                             "Origin"           always;

    location / {
        # Short-circuit preflight at nginx so it succeeds even if the
        # upstream is briefly down (deploy / restart / crash loop).
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin      $cors_allow_origin always;
            add_header Access-Control-Allow-Credentials "true"             always;
            add_header Access-Control-Allow-Methods     "GET, POST, OPTIONS, PUT, DELETE, PATCH" always;
            add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-DUID" always;
            add_header Access-Control-Max-Age           "600"              always;
            add_header Vary                             "Origin"           always;
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
}
