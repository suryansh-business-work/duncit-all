variable "phase" {
  description = "prepare = set up the new host and copy state while the old one serves; cutover = stop the old stateful services, final sync, start everything; finalize = remove the migration key from both hosts."
  type        = string
  default     = "prepare"

  validation {
    condition     = contains(["prepare", "cutover", "finalize"], var.phase)
    error_message = "phase must be prepare, cutover or finalize."
  }
}

variable "sync_round" {
  description = "Bump to copy the old server's state again during prepare (the copy only moves what changed)."
  type        = number
  default     = 1
}

variable "new_server_ip" {
  description = "Public IPv4 of the new host (`terraform -chdir=../compute/<provider> output -raw server_ip`)."
  type        = string
}

variable "new_server_ssh_private_key_path" {
  description = "Private key for root on the new host (the pair of compute's ssh_public_key_path)."
  type        = string
}

variable "old_server_ip" {
  description = "Public IPv4 of the server being migrated away from."
  type        = string
}

variable "old_server_password" {
  description = "Root password of the old server. Set TF_VAR_old_server_password in the shell — never in a file."
  type        = string
  sensitive   = true
}

variable "atlas_project_id" {
  description = "MongoDB Atlas project id whose IP access list must admit the new host."
  type        = string
}

variable "stateful_services" {
  description = "Compose services that must never run on two hosts at once: the API server (schedulers) and the WhatsApp gateway (one session)."
  type        = list(string)
  default     = ["server", "open-wa"]
}

variable "swap_size_gb" {
  description = "Swap file created on the new host when it has none. 0 disables."
  type        = number
  default     = 4
}
