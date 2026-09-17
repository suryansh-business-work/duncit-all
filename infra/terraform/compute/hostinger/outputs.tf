output "server_ip" {
  description = "Public IPv4 of the new host — the input of the dns and server stacks."
  value       = hostinger_vps.duncit.ipv4_address
}

output "vps_id" {
  description = "Hostinger VPS id (hPanel, support tickets, `terraform import`)."
  value       = hostinger_vps.duncit.id
}
