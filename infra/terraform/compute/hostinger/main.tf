# Buys and creates the VPS the Duncit stacks move to.
#
# COMPUTE CONTRACT — every infra/terraform/compute/<provider> stack creates one
# Debian 13 host with root SSH access for `ssh_public_key_path` and outputs
# `server_ip`. The dns and server stacks only ever consume that IP, so moving
# to another provider later means adding a sibling folder with the same output;
# nothing else changes.
#
# WARNING: applying this PURCHASES a plan on the account's default payment method.

data "hostinger_vps_plans" "all" {}
data "hostinger_vps_data_centers" "all" {}
data "hostinger_vps_templates" "all" {}

locals {
  plan_ids        = [for plan in data.hostinger_vps_plans.all.plans : plan.id]
  data_center_ids = [for dc in data.hostinger_vps_data_centers.all.data_centers : dc.id if dc.city == var.data_center_city]
  template_ids    = [for tpl in data.hostinger_vps_templates.all.templates : tpl.id if tpl.name == var.os_template_name]
}

resource "hostinger_vps_ssh_key" "operator" {
  name = "${var.hostname} root"
  key  = trimspace(file(pathexpand(var.ssh_public_key_path)))
}

resource "hostinger_vps" "duncit" {
  plan           = var.plan_id
  data_center_id = length(local.data_center_ids) == 1 ? local.data_center_ids[0] : null
  template_id    = length(local.template_ids) == 1 ? local.template_ids[0] : null
  hostname       = var.hostname
  ssh_key_ids    = [hostinger_vps_ssh_key.operator.id]

  lifecycle {
    # This is production. Removing it is a deliberate edit, never a stray destroy.
    prevent_destroy = true

    precondition {
      condition     = contains(local.plan_ids, var.plan_id)
      error_message = "Unknown plan_id. Valid ids: ${join(", ", local.plan_ids)}"
    }
    precondition {
      condition     = length(local.data_center_ids) == 1
      error_message = "data_center_city must match exactly one data center. Cities: ${join(", ", distinct([for dc in data.hostinger_vps_data_centers.all.data_centers : dc.city]))}"
    }
    precondition {
      condition     = length(local.template_ids) == 1
      error_message = "os_template_name must match exactly one template. Names: ${join(", ", [for tpl in data.hostinger_vps_templates.all.templates : tpl.name])}"
    }
  }
}
