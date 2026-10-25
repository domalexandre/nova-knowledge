# NOVA Knowledge

**Discover what matters, one idea at a time.**

NOVA is a mobile-first knowledge discovery product that turns research, technology and useful ideas into concise, understandable cards.

## MVP 0.3 — Live Sources + Ask NOVA

- Personalised **For You** feed
- **Trending**, **Latest** and **Saved** views
- Topic preferences stored locally
- Search across ideas, topics, authors and sources
- Save/bookmark persistence via localStorage
- Daily Knowledge briefing surface
- Responsive, iPhone-first interface
- Live server-side ingestion from **arXiv**, **PubMed** and **Hacker News**
- 15-minute edge cache with stale-while-revalidate support
- Partial-source resilience: one source can fail without taking down the whole feed
- Curated demo fallback if every live source is temporarily unavailable
- **NOVA Explain** with Simple, Professional and Expert modes
- **Ask NOVA** for source-grounded questions
- On-demand AI only: normal feed browsing does not trigger model calls
- AI responses constrained to the source context supplied by the feed
- 6-hour response cache for repeated AI requests
- Basic per-client AI request guard of 15 requests per hour
- Vercel AI Gateway with short-lived **OIDC** authentication; no long-lived AI secret is stored in the repository
- Default AI model: `openai/gpt-6-luna`

## Data-source and AI notes

The live feed links back to original source records/articles. PubMed content is treated as informational research metadata and is not medical advice. Abstract copyright can remain with publishers or authors.

NOVA AI is designed as a source explainer rather than an independent authority. It is instructed not to invent methods, statistics, citations or findings that are missing from the supplied context and to direct the user to the original source when the available context is insufficient.

For NCBI deployments at larger scale, configure `NCBI_CONTACT_EMAIL` in Vercel so E-utilities requests can include a developer contact address in line with NCBI guidance.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Local AI requests require either `AI_GATEWAY_API_KEY` or an environment that supplies `VERCEL_OIDC_TOKEN`. Deployed Vercel environments use the project's OIDC configuration.

## Next phases

1. Supabase authentication and synced user profiles.
2. Persistent server-side bookmarks, reading history and AI usage quotas.
3. Behaviour-based interest ranking and a genuinely personalised **For You** feed.
4. Add medRxiv and bioRxiv live sources.
5. Daily personalised briefing and notifications.
6. Pro subscription and Stripe billing.
7. PWA/mobile installation and final production hardening.

## Credits

NOVA is a new product built from scratch and conceptually inspired by the open-source ArXivTok project by Miguel07Alm. No ArXivTok branding is used. See `THIRD_PARTY_NOTICES.md` for attribution information.

Copyright © 2026 domalexandre. All rights reserved unless otherwise stated.
