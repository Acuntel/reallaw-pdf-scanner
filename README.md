# REAL Law Contract Scanner

Drop a Chicago Multi-Board 8.0 Residential Contract PDF, get a 30-second shorthand summary plus an explicit list of missing fields.

## How it works

1. PDF uploaded to `/api/summarize`
2. `pdf-lib` enumerates every AcroForm field (text, checkbox, radio, dropdown, signature) — filled OR blank
3. PDF sent directly to Anthropic Claude (claude-sonnet-4-6) with adaptive thinking
4. Returns a structured summary + a "MISSING / NEEDS ATTENTION" section flagging blank critical fields

## Local dev

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

## Deployment

- Hosted on Vercel
- Required env var: `ANTHROPIC_API_KEY` (set in Vercel project settings)
- The master prompt (~1.5K tokens) is cached via `cache_control: ephemeral` — every request after the first costs ~10% on the system prompt portion

## Model choice

Default is `claude-sonnet-4-6` — best balance of speed, cost, and accuracy for structured extraction. Swap to `claude-opus-4-7` in `app/api/summarize/route.ts` if you need maximum accuracy on a particularly tricky contract.

## Tweaking the master prompt

Edit `lib/masterPrompt.ts`. Section headers and the missing-fields rule are explicit there — adjust as the workflow evolves.
