# Turns a fresh host into the Duncit server and moves the old server's state
# onto it, in three phases (see infra/terraform/README.md for the full runbook):
#
#   prepare   bootstrap + copy state + start everything except the stateful
#             services, while the old server keeps serving
#   cutover   stop the stateful services on the old server, copy the final
#             delta, start everything on the new one, verify
#   finalize  remove the migration key from both hosts
#
# The new host pulls from the old one directly (server to server) with a
# throwaway key, so app builds, backups and secrets never cross this machine.

locals {
  scripts_dir = "${path.module}/../scripts"
  remote_dir  = "/root/duncit-migration"
  scripts_sha = sha256(join("", [
    for script in sort(fileset(local.scripts_dir, "*.sh")) : filesha256("${local.scripts_dir}/${script}")
  ]))

  new_host_private_key = file(pathexpand(var.new_server_ssh_private_key_path))
  migration_pubkey     = "${trimspace(tls_private_key.migration.public_key_openssh)} duncit-migration"
  stateful             = join(" ", var.stateful_services)
  migrating            = var.phase != "finalize"

  # Every step exports the same two addresses to the scripts.
  hosts_env = "OLD_HOST=${var.old_server_ip} NEW_HOST=${var.new_server_ip}"
}

resource "tls_private_key" "migration" {
  algorithm = "ED25519"
}

# --- New host: scripts + bootstrap -------------------------------------------

resource "terraform_data" "new_host_scripts" {
  triggers_replace = [var.new_server_ip, local.scripts_sha]

  connection {
    type        = "ssh"
    host        = var.new_server_ip
    user        = "root"
    private_key = local.new_host_private_key
  }

  provisioner "remote-exec" {
    inline = ["mkdir -p ${local.remote_dir}"]
  }

  provisioner "file" {
    source      = "${local.scripts_dir}/"
    destination = local.remote_dir
  }

  # A Windows checkout may have given the scripts CRLF endings.
  provisioner "remote-exec" {
    inline = ["sed -i 's/\\r$//' ${local.remote_dir}/*.sh"]
  }
}

resource "terraform_data" "bootstrap" {
  depends_on       = [terraform_data.new_host_scripts]
  triggers_replace = [var.new_server_ip, var.swap_size_gb, filesha256("${local.scripts_dir}/bootstrap-host.sh")]

  connection {
    type        = "ssh"
    host        = var.new_server_ip
    user        = "root"
    private_key = local.new_host_private_key
  }

  provisioner "remote-exec" {
    inline = ["SWAP_SIZE_GB=${var.swap_size_gb} bash ${local.remote_dir}/bootstrap-host.sh"]
  }
}

# --- Migration key: old host trusts it, new host holds it ---------------------

resource "terraform_data" "old_host_trusts_migration_key" {
  count            = local.migrating ? 1 : 0
  triggers_replace = [var.old_server_ip, local.migration_pubkey]

  connection {
    type     = "ssh"
    host     = var.old_server_ip
    user     = "root"
    password = var.old_server_password
  }

  provisioner "remote-exec" {
    inline = [
      "set -e",
      "install -d -m 700 /root/.ssh",
      "grep -qxF '${local.migration_pubkey}' /root/.ssh/authorized_keys 2>/dev/null || echo '${local.migration_pubkey}' >> /root/.ssh/authorized_keys",
    ]
  }
}

resource "terraform_data" "new_host_migration_key" {
  count            = local.migrating ? 1 : 0
  depends_on       = [terraform_data.bootstrap]
  triggers_replace = [var.new_server_ip, local.migration_pubkey]

  connection {
    type        = "ssh"
    host        = var.new_server_ip
    user        = "root"
    private_key = local.new_host_private_key
  }

  provisioner "file" {
    content     = tls_private_key.migration.private_key_openssh
    destination = "/root/.ssh/duncit_migration"
  }

  provisioner "remote-exec" {
    inline = ["chmod 600 /root/.ssh/duncit_migration"]
  }
}

# --- Phase: prepare ------------------------------------------------------------

resource "terraform_data" "prepare" {
  count = var.phase == "prepare" ? 1 : 0
  depends_on = [
    terraform_data.new_host_migration_key,
    terraform_data.old_host_trusts_migration_key,
    mongodbatlas_project_ip_access_list.new_server,
  ]
  triggers_replace = [var.new_server_ip, var.old_server_ip, var.sync_round]

  connection {
    type        = "ssh"
    host        = var.new_server_ip
    user        = "root"
    private_key = local.new_host_private_key
  }

  provisioner "remote-exec" {
    inline = [
      "set -e",
      "cd ${local.remote_dir}",
      "${local.hosts_env} bash sync-from-old.sh",
      "STATEFUL_SERVICES='${local.stateful}' bash start-stacks.sh prepare",
      "STATEFUL_SERVICES='${local.stateful}' bash verify.sh prepare",
    ]
  }
}

# --- Phase: cutover -------------------------------------------------------------

resource "terraform_data" "cutover" {
  count = var.phase == "prepare" ? 0 : 1
  depends_on = [
    terraform_data.new_host_migration_key,
    terraform_data.old_host_trusts_migration_key,
    mongodbatlas_project_ip_access_list.new_server,
  ]
  triggers_replace = [var.new_server_ip, var.old_server_ip]

  # 1. Old host: stop what must never run twice.
  provisioner "file" {
    source      = "${local.scripts_dir}/stop-stateful.sh"
    destination = "/root/duncit-migration-stop-stateful.sh"

    connection {
      type     = "ssh"
      host     = var.old_server_ip
      user     = "root"
      password = var.old_server_password
    }
  }

  provisioner "remote-exec" {
    inline = [
      "set -e",
      "sed -i 's/\\r$//' /root/duncit-migration-stop-stateful.sh",
      "STATEFUL_SERVICES='${local.stateful}' bash /root/duncit-migration-stop-stateful.sh",
    ]

    connection {
      type     = "ssh"
      host     = var.old_server_ip
      user     = "root"
      password = var.old_server_password
    }
  }

  # 2. New host: final delta + SonarQube volumes, start everything, verify.
  provisioner "remote-exec" {
    inline = [
      "set -e",
      "cd ${local.remote_dir}",
      "${local.hosts_env} COPY_VOLUMES=1 bash sync-from-old.sh",
      "STATEFUL_SERVICES='${local.stateful}' bash start-stacks.sh all",
      "STATEFUL_SERVICES='${local.stateful}' bash verify.sh all",
    ]

    connection {
      type        = "ssh"
      host        = var.new_server_ip
      user        = "root"
      private_key = local.new_host_private_key
    }
  }
}

# --- Phase: finalize ------------------------------------------------------------

resource "terraform_data" "finalize" {
  count            = var.phase == "finalize" ? 1 : 0
  depends_on       = [terraform_data.cutover]
  triggers_replace = [var.new_server_ip, var.old_server_ip]

  provisioner "remote-exec" {
    inline = [
      "sed -i '/ duncit-migration$/d' /root/.ssh/authorized_keys",
      "rm -f /root/duncit-migration-stop-stateful.sh",
    ]

    connection {
      type     = "ssh"
      host     = var.old_server_ip
      user     = "root"
      password = var.old_server_password
    }
  }

  provisioner "remote-exec" {
    inline = ["rm -f /root/.ssh/duncit_migration"]

    connection {
      type        = "ssh"
      host        = var.new_server_ip
      user        = "root"
      private_key = local.new_host_private_key
    }
  }
}
