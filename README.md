# REAL Law Contract Scanner

Drop a Chicago Multi-Board 8.0 Residential Contract PDF, get a 30-second shorthand summary plus an explicit list of missing fields.

## How it works

1. PDF uploaded to `/api/summarize`
2. `pdf-lib` enumerates every AcroForm field (text, checkbox, radio, dropdown, signature) — filled OR blank
3. Field dump sent to Groq Llama 3.3 70B with the master prompt in `lib/masterPrompt.ts`
4. Returns a structured summary + a "MISSING / NEEDS ATTENTION" section flagging blank critical fields

## Local dev

```bash
npm install
echo "GROQ_API_KEY=gsk_..." > .env.local
npm run dev
```

## Deployment

- Hosted on Vercel
- Required env var: `GROQ_API_KEY` (set in Vercel project settings)
- Free tier: Groq is free, Vercel hobby is free → $0/month

## Why Groq

- REAL Law's chatbot already uses Groq
- Free tier is generous
- Llama 3.3 70B is plenty for structured field extraction

## Tweaking the master prompt

Edit `lib/masterPrompt.ts`. Section headers and the missing-fields rule are explicit there — adjust as the workflow evolves.
