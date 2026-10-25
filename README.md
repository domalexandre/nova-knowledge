# NOVA Knowledge

**Discover what matters, one idea at a time.**

NOVA is a mobile-first knowledge discovery product that turns research, technology and useful ideas into concise, understandable cards.

## MVP 0.2 — Live Sources

- Personalised **For You** feed
- **Trending**, **Latest** and **Saved** views
- Topic preferences stored locally
- Search across ideas, topics, authors and sources
- Save/bookmark persistence via localStorage
- **NOVA Explain** with Simple, Professional and Expert modes
- Daily Knowledge briefing surface
- Responsive, iPhone-first interface
- Live server-side ingestion from **arXiv**, **PubMed** and **Hacker News**
- 15-minute edge cache with stale-while-revalidate support
- Partial-source resilience: one source can fail without taking down the whole feed
- Curated demo fallback if every live source is temporarily unavailable
- No paid AI API required for the live-feed phase

## Data-source notes

The live feed links back to original source records/articles. PubMed content is treated as informational research metadata and is not medical advice. Abstract copyright can remain with publishers or authors.

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

## Next phases

1. Add medRxiv and bioRxiv live sources.
2. Supabase authentication and synced user profiles.
3. On-demand AI summaries and **Ask NOVA** using a production model provider.
4. Interest ranking based on reading, saving and explanation behaviour.
5. Daily personalised briefing and notifications.
6. Pro subscription and Stripe billing.
7. PWA/mobile installation and final production hardening.

## Credits

NOVA is a new product built from scratch and conceptually inspired by the open-source ArXivTok project by Miguel07Alm. No ArXivTok branding is used. See `THIRD_PARTY_NOTICES.md` for attribution information.

Copyright © 2026 domalexandre. All rights reserved unless otherwise stated.
