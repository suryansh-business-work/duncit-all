terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.25"
    }
  }
}

# Token from the CLOUDFLARE_API_TOKEN environment variable. Scope it to
# Zone:Edit + DNS:Edit on this account (Cloudflare Free plan is enough).
provider "cloudflare" {}
