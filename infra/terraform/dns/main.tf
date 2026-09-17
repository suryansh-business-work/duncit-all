# The duncit.com zone on Cloudflare (DNS only — no proxy, exactly like the
# GoDaddy zone today: certbot's HTTP-01 check and the TURN relay's UDP ports
# both need the real server IP).
#
# Server hostnames are not listed here: they are read from the nginx vhosts,
# so a portal added to deploy/nginx gets its DNS record on the next apply.

resource "cloudflare_zone" "this" {
  account = {
    id = var.cloudflare_account_id
  }
  name = var.zone_name
  type = "full"

  lifecycle {
    prevent_destroy = true
  }
}

locals {
  nginx_hosts = flatten([
    for site in var.nginx_site_files : [
      for match in regexall("(?m)^\\s*server_name\\s+([^;]+);", file("${path.module}/${site}")) :
      regexall("\\S+", match[0])
    ]
  ])

  server_hosts = toset(concat(local.nginx_hosts, var.extra_server_hosts))

  foreign_hosts = [
    for host in local.server_hosts : host
    if host != var.zone_name && !endswith(host, ".${var.zone_name}")
  ]
}

resource "cloudflare_dns_record" "server" {
  for_each = local.server_hosts

  zone_id = cloudflare_zone.this.id
  name    = each.value
  type    = "A"
  content = var.target_ip
  ttl     = var.server_ttl
  proxied = false
  comment = "Duncit server - managed by infra/terraform/dns"

  lifecycle {
    precondition {
      condition     = length(local.foreign_hosts) == 0
      error_message = "These hosts are outside ${var.zone_name}: ${join(", ", local.foreign_hosts)}"
    }
  }
}

resource "cloudflare_dns_record" "other" {
  for_each = { for record in var.other_records : "${record.type} ${record.name} ${record.content}" => record }

  zone_id  = cloudflare_zone.this.id
  name     = each.value.name
  type     = each.value.type
  content  = each.value.content
  priority = each.value.priority
  ttl      = 3600
  proxied  = false
  comment  = "Managed by infra/terraform/dns"
}
