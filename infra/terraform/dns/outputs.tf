output "name_servers" {
  description = "Set these as the domain's nameservers at GoDaddy (Domain > DNS > Nameservers > Change > custom)."
  value       = cloudflare_zone.this.name_servers
}

output "zone_status" {
  description = "`pending` until GoDaddy points at the nameservers above, then `active`."
  value       = cloudflare_zone.this.status
}

output "server_hosts" {
  description = "Every hostname pointed at target_ip."
  value       = sort(tolist(local.server_hosts))
}

output "target_ip" {
  value = var.target_ip
}
