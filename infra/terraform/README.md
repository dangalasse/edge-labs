# Edge Labs — Terraform (Cloudflare route stub)

Minimal Infrastructure-as-Code mirror for the **edge.galasse.dev** Worker route.

## What this covers

| Resource | Purpose |
|----------|---------|
| `cloudflare_workers_route.edge_labs` | Binds `edge.galasse.dev/*` to the `edge-labs` Worker script |

Worker **script upload** (bindings: `AI`, `GEMINI_MODEL`, optional `GEMINI_API_KEY` secret) is **not** managed here — use:

- `npx wrangler deploy`, or
- MCP deploy via `.cf_upload_code.js` at repo root

## Prerequisites

- Cloudflare account with Workers + DNS for `galasse.dev`
- API token with **Workers Scripts Edit** and **Workers Routes Edit**
- Zone id for `galasse.dev`

## Usage

```bash
cd infra/terraform
export CLOUDFLARE_API_TOKEN="..."
terraform init
terraform plan \
  -var="cloudflare_account_id=YOUR_ACCOUNT_ID" \
  -var="cloudflare_zone_id=YOUR_ZONE_ID"
terraform apply \
  -var="cloudflare_account_id=YOUR_ACCOUNT_ID" \
  -var="cloudflare_zone_id=YOUR_ZONE_ID"
```

## Related endpoints (live Worker)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Playground (Erro · SDD · DDD · TDD tabs) |
| GET | `/health` | Provider probe |
| POST | `/analyze-error` | SRE error analysis (legacy JSON shape) |
| POST | `/coach` | Modes `sre`, `sdd`, `ddd`, `tdd` (rich coaching JSON) |

## Honest coaching disclaimer

Prompt packs under `src/prompts/` are **coaching excerpts**, not fine-tuned models. SDD mode includes a public TOTE-inspired glossary summary for demonstration only.
