terraform {
  required_version = ">= 1.6.0"

  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 2.18"
    }
  }
}

# Credentials from MONGODB_ATLAS_CLIENT_ID + MONGODB_ATLAS_CLIENT_SECRET
# (an Atlas service account with Project Owner on the Duncit project).
provider "mongodbatlas" {}
