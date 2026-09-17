variable "hostname" {
  description = "FQDN given to the new VPS, e.g. vps2.duncit.com."
  type        = string
}

variable "plan_id" {
  description = "Hostinger VPS plan id, e.g. hostingercom-vps-kvm4-usd-1m. A wrong id fails the plan with the list of valid ones."
  type        = string
}

variable "data_center_city" {
  description = "City of the Hostinger data center. A wrong city fails the plan with the list of valid ones."
  type        = string
}

variable "os_template_name" {
  description = "Exact Hostinger OS template name. Must be Debian 13 (or anything shipping nginx >= 1.25.1). A wrong name fails the plan with the list of valid ones."
  type        = string
}

variable "ssh_public_key_path" {
  description = "Public key installed for root. Its private half is what infra/terraform/server connects with."
  type        = string
}
