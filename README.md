# NOVA Knowledge

**Discover what matters, one idea at a time.**

NOVA is a mobile-first knowledge discovery product that turns research, technology and useful ideas into concise, understandable cards. The MVP focuses on a personalised feed, topic selection, search, saved items and three explanation levels.

## MVP 0.1

- Personalised **For You** feed
- **Trending**, **Latest** and **Saved** views
- Topic preferences stored locally
- Search across ideas, topics and sources
- Save/bookmark persistence via localStorage
- **NOVA Explain** with Simple, Professional and Expert modes
- Daily Knowledge briefing surface
- Responsive, iPhone-first interface
- No paid AI API required for the first demo

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

1. Live source ingestion from arXiv, PubMed, medRxiv, bioRxiv and Hacker News.
2. Supabase authentication and synced user profiles.
3. AI summaries and Ask NOVA using a production model provider.
4. Interest ranking based on reading and saving behaviour.
5. Daily personalised briefing and notifications.
6. Pro subscription and Stripe billing.
7. PWA/mobile installation and production deployment.

## Credits

NOVA is a new product built from scratch and conceptually inspired by the open-source ArXivTok project by Miguel07Alm. No ArXivTok branding is used. See `THIRD_PARTY_NOTICES.md` for attribution information.

Copyright © 2026 domalexandre. All rights reserved unless otherwise stated.
