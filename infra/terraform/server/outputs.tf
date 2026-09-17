output "phase" {
  value = var.phase
}

output "next_step" {
  description = "What the runbook expects after this apply."
  value = {
    prepare  = "New host is ready and verified without its stateful services. Check it with `curl --resolve`, then freeze deploys and apply with phase = \"cutover\"."
    cutover  = "New host runs everything and passed verify.sh. NOW: dns apply with target_ip = ${var.new_server_ip}, set the GitHub secret SSH_HOST = ${var.new_server_ip}, update the TURN entries in both Tech portals, then apply with phase = \"finalize\"."
    finalize = "Migration key removed from both hosts. Keep the old server stopped (not deleted) for the rollback window, then rotate its root password."
  }[var.phase]
}
