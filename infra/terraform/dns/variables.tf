variable "cloudflare_account_id" {
  description = "Cloudflare account id (dashboard > any page > Account ID)."
  type        = string
}

variable "zone_name" {
  description = "Apex domain, e.g. duncit.com."
  type        = string
}

variable "target_ip" {
  description = "IPv4 every server hostname points at. The OLD server's IP until cutover, then the new one."
  type        = string

  validation {
    condition     = can(cidrhost("${var.target_ip}/32", 0))
    error_message = "target_ip must be an IPv4 address."
  }
}

variable "nginx_site_files" {
  description = "nginx vhost files (relative to this folder) whose server_name hosts all resolve to the server."
  type        = list(string)
  default = [
    "../../../deploy/nginx/duncit.com",
    "../../../deploy/nginx/staging.duncit.com",
  ]
}

variable "extra_server_hosts" {
  description = "Hostnames that resolve to the server but have no nginx vhost."
  type        = list(string)
  default     = []
}

variable "other_records" {
  description = "Every non-server record of the zone (mail, verification). Kept in records.auto.tfvars."
  type = list(object({
    type     = string
    name     = string
    content  = string
    priority = optional(number)
  }))
  default = []
}

variable "server_ttl" {
  description = "TTL of the server records in seconds. 60 keeps a cutover or rollback to about a minute."
  type        = number
  default     = 60
}
