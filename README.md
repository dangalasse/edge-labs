# Edge Labs

Cloudflare Worker for **LLMOps** on the **Cloudflare Free Tier**.

- **Primary:** Workers AI (`@cf/meta/llama-3.1-8b-instruct-fp8`) via `[ai]` binding — always live, no Google key.
- **Optional:** Google Gemini (AI Studio Free Tier) when `GEMINI_API_KEY` is set via `wrangler secret`.

## Live

| Surface | URL |
|---------|-----|
| Health | https://edge.galasse.dev/health |
| Analyze | `POST https://edge.galasse.dev/analyze-error` |
| workers.dev | https://edge-labs.dantonguerragalasse.workers.dev/health |
| Source | https://github.com/dangalasse/edge-labs |

### Example

```bash
curl -sS -X POST https://edge.galasse.dev/analyze-error \
  -H 'content-type: application/json' \
  -d '{"message":"ECONNREFUSED 127.0.0.1:5432","context":"NestJS boot"}'
```

## Why this stack

| Choice | WHY |
|--------|-----|
| Cloudflare Workers | Free Tier edge, zero VM cost |
| Workers AI binding | Inference without leaving CF Free Tier |
| Optional Gemini | Shows multi-provider LLMOps + secret hygiene |
| No keys in git | `wrangler secret` / dashboard only |

## Setup

```bash
npm install
npx wrangler deploy
# optional:
npx wrangler secret put GEMINI_API_KEY
```

Custom hostname `edge.galasse.dev` is attached via Cloudflare Workers Routes / Domains on zone `galasse.dev`.

## Security

- Secrets never in `wrangler.toml`
- Upstream errors → HTTP 502 without leaking credentials
- CORS `*` for Labs demos — tighten for production APIs

## License

MIT
