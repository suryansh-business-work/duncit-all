# Committed: every duncit.com record that is NOT generated from deploy/nginx.
# Captured from public DNS on 2026-09-17. Before moving the nameservers, export
# the GoDaddy zone (DNS > ... > Export zone file) and add anything missing here —
# a record left out stops resolving the moment Cloudflare becomes authoritative.

# Resolves to the server today but has no vhost (legacy tracking host).
extra_server_hosts = ["track.duncit.com"]

other_records = [
  # Google Workspace mail.
  { type = "MX", name = "duncit.com", content = "aspmx.l.google.com", priority = 1 },
  { type = "MX", name = "duncit.com", content = "alt1.aspmx.l.google.com", priority = 5 },
  { type = "MX", name = "duncit.com", content = "alt2.aspmx.l.google.com", priority = 5 },
  { type = "MX", name = "duncit.com", content = "alt3.aspmx.l.google.com", priority = 10 },
  { type = "MX", name = "duncit.com", content = "alt4.aspmx.l.google.com", priority = 10 },

  # SPF. GoDaddy served it through its own `dc-aa8e722993._spfm` include, which
  # only expanded to Google's — so it is flattened here, same result.
  { type = "TXT", name = "duncit.com", content = "\"v=spf1 include:_spf.google.com ~all\"" },

  { type = "TXT", name = "duncit.com", content = "\"google-site-verification=0ayn078THVcjLwxAQn_dHzMPTAPkjIdIWkl-Jj0AgBY\"" },
]
