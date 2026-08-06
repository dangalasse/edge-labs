# Edge Labs — Cloudflare Worker route (IaC mirror)
#
# Documents how edge.galasse.dev maps to the edge-labs Worker script.
# Apply with Cloudflare API token (Workers Scripts + Routes edit).
#
# This is a minimal stub — adjust account_id and zone_id for your tenant.

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account id (Workers owner)"
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Zone id for galasse.dev"
  default     = "" # set via TF_VAR or tfvars
}

variable "worker_script_name" {
  type        = string
  description = "Deployed Workers script name"
  default     = "edge-labs"
}

variable "hostname" {
  type        = string
  description = "Public hostname for Edge Labs"
  default     = "edge.galasse.dev"
}

provider "cloudflare" {
  # API token via CLOUDFLARE_API_TOKEN env var
}

# Route: edge.galasse.dev/* -> edge-labs Worker
resource "cloudflare_workers_route" "edge_labs" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "${var.hostname}/*"
  script_name = var.worker_script_name
}

output "edge_labs_route" {
  value = {
    hostname    = var.hostname
    pattern     = cloudflare_workers_route.edge_labs.pattern
    script_name = var.worker_script_name
  }
}

output "deploy_note" {
  value = "Worker script deploy is separate (wrangler or MCP .cf_upload_code.js). This route binds the hostname to the script."
}
