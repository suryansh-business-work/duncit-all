terraform {
  required_version = ">= 1.6.0"

  required_providers {
    hostinger = {
      source  = "hostinger/hostinger"
      version = "~> 0.1.23"
    }
  }
}

# Token from the HOSTINGER_API_TOKEN environment variable (hPanel > Profile > API).
provider "hostinger" {}
