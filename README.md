# NOVA Knowledge

**Discover what matters, one idea at a time.**

NOVA is a mobile-first knowledge discovery product that turns research, technology and useful ideas into concise, understandable cards.

## MVP 0.4 — Accounts + Personalisation

- Personalised **For You** feed
- **Trending**, **Latest** and **Saved** views
- Topic preferences stored locally in guest mode and synced to Supabase when signed in
- Behaviour-based ranking using saves, source opens, Explain and Ask NOVA activity
- Search across ideas, topics, authors and sources
- Saved-item snapshots persist even after the live feed refreshes
- Guest data migration into a newly signed-in account
- Supabase email/password authentication
- Cross-device sync for interests and saved ideas
- Cloud activity history for future recommendation improvements
- AI usage tracking per signed-in account
- Account-aware AI request limits when Supabase is configured; device/IP fallback otherwise
- Row Level Security (RLS) policies so authenticated users can access only their own NOVA data
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
- Vercel AI Gateway with short-lived **OIDC** authentication; no long-lived AI secret is stored in the repository
- Default AI model: `openai/gpt-6-luna`

## Supabase setup

The database schema and RLS policies live in:

```text
supabase/migrations/20261025_nova_accounts.sql
```

The app expects the public project URL and Supabase publishable key. See `.env.example` for the exact variable names. The publishable key is safe to use in browser code; RLS remains the authorization boundary.

Tables used by the MVP:

- `profiles`
- `user_preferences`
- `saved_items`
- `user_activity`
- `ai_usage`

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

1. Activate the Supabase project, apply the included migration and add the public environment variables to Vercel.
2. Add medRxiv and bioRxiv live sources.
3. Create a stronger recommendation model from synced activity history.
4. Daily personalised briefing and notifications.
5. Pro subscription and Stripe billing.
6. PWA/mobile installation and final production hardening.

## Credits

NOVA is a new product built from scratch and conceptually inspired by the open-source ArXivTok project by Miguel07Alm. No ArXivTok branding is used. See `THIRD_PARTY_NOTICES.md` for attribution information.

Copyright © 2026 domalexandre. All rights reserved unless otherwise stated.
