# The API server connects to Atlas at boot; a host missing from the access list
# crash-loops behind a 502. The old server's entry is left alone — remove it by
# hand once the old server is decommissioned.
resource "mongodbatlas_project_ip_access_list" "new_server" {
  project_id = var.atlas_project_id
  ip_address = var.new_server_ip
  comment    = "Duncit VPS - managed by infra/terraform/server"
}
