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
    add_header Access-Control-Allow-Headers     "Authorization, Content-Type, X-Requested-With, Apollo-Require-Preflight, X-Apollo-Operation-Name, X-Apollo-Operation-Id, Apollographql-Client-Name, Apollographql-Client-Version, X-DUID, X-Auth, X-CSRF-Token, Accept, Accept-Language, Cache-Control, Pragma, Origin, User-Agent" always;
    add_header Access-Control-Expose-Headers    "Content-Length, Content-Type, Authorization, X-DUID" always;
    add_header Access-Control-Max-Age           "600"                  always;
    add_header Vary                             "Origin"               always;

    location / {
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
