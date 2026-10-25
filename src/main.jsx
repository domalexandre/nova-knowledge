import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bookmark,
  BookmarkCheck,
  BrainCircuit,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  Globe2,
  Radio,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import './styles.css';
import NovaAssistant from './NovaAssistant.jsx';

const TOPICS = ['Artificial Intelligence', 'Business', 'Finance', 'Technology', 'Science', 'Health', 'Psychology', 'Space'];

const SEED = [
  {
    id: 'nova-ai-agents',
    title: 'AI agents are getting better at checking their own work',
    source: 'arXiv',
    topic: 'Artificial Intelligence',
    authors: 'Research digest',
    summary: 'A growing line of research explores systems that review intermediate steps, critique their own output and try again before presenting a final answer.',
    why: 'More reliable self-correction could make AI assistants safer and more useful for complex, multi-step work.',
    expert: 'The core idea is iterative inference: introduce an evaluation or verifier stage between generation and final output. The useful research question is whether the evaluator adds genuine signal rather than simply reinforcing the generator’s original errors.',
    url: 'https://arxiv.org/',
    publishedAt: '2026-10-24T08:00:00Z',
    score: 98,
    live: false,
  },
  {
    id: 'nova-space-biosignatures',
    title: 'How scientists decide whether a distant planet might support life',
    source: 'arXiv',
    topic: 'Space',
    authors: 'Astronomy digest',
    summary: 'Researchers combine atmospheric chemistry, temperature, stellar radiation and planetary models instead of relying on a single “life signal”.',
    why: 'It reduces false positives and helps future telescopes prioritise the most promising worlds.',
    expert: 'Modern biosignature assessment is a Bayesian-style evidence problem. Atmospheric disequilibrium, host-star spectra and geochemical context must be modelled jointly because abiotic processes can mimic individual biological markers.',
    url: 'https://arxiv.org/archive/astro-ph',
    publishedAt: '2026-10-23T08:00:00Z',
    score: 93,
    live: false,
  },
  {
    id: 'nova-health-sleep',
    title: 'Sleep regularity may matter almost as much as total sleep time',
    source: 'PubMed',
    topic: 'Health',
    authors: 'Health research digest',
    summary: 'Recent observational work increasingly looks at how consistent sleep and wake times relate to health, not only how many hours people sleep.',
    why: 'A regular routine may be a practical health target for people who cannot always increase total sleep duration.',
    expert: 'Sleep regularity metrics attempt to capture circadian consistency across days. Association studies need careful adjustment for work schedules, socioeconomic factors and baseline health before causal claims can be made.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/',
    publishedAt: '2026-10-22T08:00:00Z',
    score: 91,
    live: false,
  },
  {
    id: 'nova-finance-behaviour',
    title: 'Why small automatic saving rules often beat ambitious plans',
    source: 'Research synthesis',
    topic: 'Finance',
    authors: 'Behavioural finance digest',
    summary: 'Behavioural research repeatedly shows that defaults, automation and friction reduction can influence saving behaviour more reliably than motivation alone.',
    why: 'Good financial systems can reduce the number of decisions required every month.',
    expert: 'The mechanism is consistent with default effects, present bias and bounded attention. Stronger evidence comes from interventions that compare opt-in versus automatic enrolment while controlling for income and liquidity constraints.',
    url: 'https://www.nber.org/',
    publishedAt: '2026-10-21T08:00:00Z',
    score: 88,
    live: false,
  },
  {
    id: 'nova-psych-learning',
    title: 'Spacing your learning beats repeating everything in one sitting',
    source: 'PubMed',
    topic: 'Psychology',
    authors: 'Cognitive science digest',
    summary: 'Spacing study sessions across time generally improves long-term retention compared with massed practice or cramming.',
    why: 'It changes how you should structure learning for exams, languages and professional skills.',
    expert: 'The spacing effect is one of the most replicated findings in memory research. Retrieval difficulty and context variability are leading explanations, although optimal intervals depend on the desired retention period.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/',
    publishedAt: '2026-10-20T08:00:00Z',
    score: 87,
    live: false,
  },
  {
    id: 'nova-tech-open-source',
    title: 'Open-source AI is accelerating experimentation for small teams',
    source: 'Hacker News',
    topic: 'Technology',
    authors: 'Technology digest',
    summary: 'Smaller companies can now prototype with increasingly capable open models, local inference tools and reusable agent frameworks.',
    why: 'It lowers the cost of testing AI products before committing to expensive infrastructure.',
    expert: 'The strategic trade-off is no longer simply open versus closed models. Teams increasingly optimise across latency, hosting cost, privacy, model quality, licensing constraints and operational complexity.',
    url: 'https://news.ycombinator.com/',
    publishedAt: '2026-10-19T08:00:00Z',
    score: 95,
    live: false,
  },
  {
    id: 'nova-business-experiments',
    title: 'The fastest product teams test demand before building the full product',
    source: 'Research synthesis',
    topic: 'Business',
    authors: 'Product research digest',
    summary: 'Small experiments, prototypes and pre-sales can reveal whether customers care before a team spends months building.',
    why: 'It protects cash and makes it easier to abandon weak ideas early.',
    expert: 'A useful experiment isolates the riskiest assumption and measures behavioural evidence rather than stated preference. Conversion, willingness to pay and repeated usage typically provide stronger signals than survey enthusiasm.',
    url: 'https://hbr.org/',
    publishedAt: '2026-10-18T08:00:00Z',
    score: 90,
    live: false,
  },
  {
    id: 'nova-science-materials',
    title: 'Machine learning is helping researchers search huge materials spaces',
    source: 'arXiv',
    topic: 'Science',
    authors: 'Materials science digest',
    summary: 'Models can rank candidate materials before expensive laboratory testing, helping researchers focus experiments on more promising combinations.',
    why: 'Faster materials discovery could affect batteries, electronics, construction and clean energy.',
    expert: 'The challenge is distribution shift between simulated training data and real laboratory outcomes. High-value systems combine predictive models with active learning so experimental results continuously improve candidate selection.',
    url: 'https://arxiv.org/',
    publishedAt: '2026-10-17T08:00:00Z',
    score: 92,
    live: false,
  },
];

const readJSON = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const formatDate = (value) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
};

function App() {
  const [tab, setTab] = useState('For You');
  const [query, setQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState(() => readJSON('nova-topics', ['Artificial Intelligence', 'Technology', 'Business']));
  const [saved, setSaved] = useState(() => readJSON('nova-saved', []));
  const [showTopics, setShowTopics] = useState(false);
  const [feed, setFeed] = useState(SEED);
  const [feedState, setFeedState] = useState({ loading: true, live: false, generatedAt: null, sourceErrors: [] });
  const [assistantItem, setAssistantItem] = useState(null);
  const [assistantMode, setAssistantMode] = useState('explain');

  useEffect(() => localStorage.setItem('nova-topics', JSON.stringify(selectedTopics)), [selectedTopics]);
  useEffect(() => localStorage.setItem('nova-saved', JSON.stringify(saved)), [saved]);

  useEffect(() => {
    const controller = new AbortController();
    const loadFeed = async () => {
      try {
        const response = await fetch('/api/feed', { signal: controller.signal });
        if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data.items) && data.items.length) {
          setFeed(data.items);
          setFeedState({ loading: false, live: true, generatedAt: data.generatedAt, sourceErrors: data.sourceErrors || [] });
          return;
        }
        throw new Error('No live items returned');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setFeedState({ loading: false, live: false, generatedAt: null, sourceErrors: [error.message] });
      }
    };
    loadFeed();
    return () => controller.abort();
  }, []);

  const items = useMemo(() => {
    let next = [...feed];
    if (tab === 'For You') next.sort((a, b) => (selectedTopics.includes(b.topic) - selectedTopics.includes(a.topic)) || b.score - a.score);
    if (tab === 'Trending') next.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (tab === 'Latest') next.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    if (tab === 'Saved') next = next.filter((item) => saved.includes(item.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      next = next.filter((item) => `${item.title} ${item.summary} ${item.topic} ${item.source} ${item.authors}`.toLowerCase().includes(q));
    }
    return next;
  }, [tab, query, selectedTopics, saved, feed]);

  const toggleSave = (id) => setSaved((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const toggleTopic = (topic) => setSelectedTopics((current) => current.includes(topic) ? current.filter((x) => x !== topic) : [...current, topic]);
  const openAssistant = (item, mode) => {
    setAssistantMode(mode);
    setAssistantItem(item);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('For You')} aria-label="NOVA home">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span>NOVA</span>
        </button>
        <button className="topic-button" onClick={() => setShowTopics(true)}>
          <Compass size={16} /> Interests
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><Zap size={14} /> DISCOVER WHAT MATTERS</div>
          <h1>One idea can change<br />what you build next.</h1>
          <p>Research, technology and useful ideas — translated into language you can actually use.</p>
          <div className="searchbox">
            <Search size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ideas, topics or sources" />
            {query && <button onClick={() => setQuery('')}><X size={16} /></button>}
          </div>
          <div className={`feed-status ${feedState.live ? 'live' : ''}`}>
            {feedState.loading ? <><span className="status-pulse" /> Connecting to live sources…</> : feedState.live ? <><Radio size={13} /> LIVE · arXiv · PubMed · Hacker News</> : <><Clock3 size={13} /> Demo fallback · live sources temporarily unavailable</>}
            <span className="ai-ready-badge"><Sparkles size={10} /> AI ON DEMAND</span>
          </div>
        </section>

        <section className="briefing">
          <div>
            <span className="briefing-label">DAILY KNOWLEDGE</span>
            <h2>Your 5-minute briefing</h2>
            <p>{feed.length} {feedState.live ? 'live' : 'curated'} ideas across science, AI, technology and more.</p>
          </div>
          <div className="briefing-icon"><BrainCircuit /></div>
        </section>

        <nav className="tabs" aria-label="Feed filters">
          {['For You', 'Trending', 'Latest', 'Saved'].map((name) => (
            <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
              {name === 'Trending' && <Flame size={15} />}{name === 'Saved' && <Bookmark size={15} />}{name}
            </button>
          ))}
        </nav>

        <section className="feed">
          {items.length === 0 ? (
            <div className="empty-state">
              <Bookmark size={28} />
              <h3>Nothing here yet</h3>
              <p>{tab === 'Saved' ? 'Save an idea and it will appear here while it remains in your active feed.' : 'Try another search.'}</p>
            </div>
          ) : items.map((item, index) => (
            <article className="knowledge-card" key={item.id}>
              <div className="card-topline">
                <span className="topic-pill">{item.topic}</span>
                <div className="source-stack">
                  <span className="source"><Globe2 size={13} /> {item.source}</span>
                  <span className="source-date">{formatDate(item.publishedAt)}</span>
                </div>
              </div>
              <div className="card-index">{String(index + 1).padStart(2, '0')}</div>
              <h2>{item.title}</h2>
              <p className="summary">{item.summary}</p>
              <div className="why">
                <span>WHY IT MATTERS</span>
                <p>{item.why}</p>
              </div>
              <div className="card-actions">
                <button className="primary" onClick={() => openAssistant(item, 'explain')}>
                  <Sparkles size={17} /> Explain
                </button>
                <button className="ask-action" onClick={() => openAssistant(item, 'ask')}>
                  <BrainCircuit size={17} /> Ask NOVA
                </button>
                <button className="icon-action" onClick={() => toggleSave(item.id)} aria-label="Save">
                  {saved.includes(item.id) ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
                </button>
                <a className="read-link" href={item.url} target="_blank" rel="noreferrer">Read original <ChevronRight size={16} /></a>
              </div>
            </article>
          ))}
        </section>
      </main>

      <footer>
        <div>
          <span>NOVA · MVP 0.3 · Live sources + AI</span>
          <span className="legal-note">PubMed/NCBI content is informational and not medical advice. Copyright may remain with publishers or authors.</span>
        </div>
        <span>Discover. Understand. Build.</span>
      </footer>

      {showTopics && (
        <div className="modal-backdrop" onClick={() => setShowTopics(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTopics(false)}><X /></button>
            <span className="eyebrow">PERSONALISE YOUR FEED</span>
            <h2>What do you want to learn?</h2>
            <p>Select the topics NOVA should prioritise for you.</p>
            <div className="topic-grid">
              {TOPICS.map((topic) => <button key={topic} onClick={() => toggleTopic(topic)} className={selectedTopics.includes(topic) ? 'selected' : ''}>{topic}</button>)}
            </div>
            <button className="done-button" onClick={() => setShowTopics(false)}>Done</button>
          </div>
        </div>
      )}

      {assistantItem && (
        <NovaAssistant
          item={assistantItem}
          initialMode={assistantMode}
          onClose={() => setAssistantItem(null)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
