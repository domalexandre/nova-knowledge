const XML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

const TOPIC_RULES = [
  ['Artificial Intelligence', ['artificial intelligence', 'machine learning', 'neural', 'language model', 'llm', 'agent', 'deep learning', 'computer vision']],
  ['Space', ['space', 'planet', 'galaxy', 'astronomy', 'cosmology', 'star ', 'stellar', 'exoplanet', 'astrophys']],
  ['Health', ['health', 'medicine', 'medical', 'clinical', 'patient', 'disease', 'sleep', 'cancer', 'therapy', 'drug']],
  ['Psychology', ['psychology', 'cognitive', 'behaviour', 'behavior', 'memory', 'emotion', 'mental', 'learning']],
  ['Finance', ['finance', 'financial', 'market', 'bank', 'investment', 'economic', 'economy', 'saving', 'inflation']],
  ['Business', ['business', 'startup', 'company', 'product', 'customer', 'entrepreneur', 'revenue', 'sales']],
  ['Science', ['physics', 'chemistry', 'biology', 'material', 'quantum', 'scientist', 'research']],
  ['Technology', ['software', 'hardware', 'developer', 'open source', 'security', 'database', 'robot', 'technology', 'web']],
];

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity] || entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanText(value = '') {
  return decodeXml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? cleanText(match[1]) : '';
}

function truncate(text, max = 520) {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function classifyTopic(text = '') {
  const haystack = text.toLowerCase();
  let winner = 'Technology';
  let best = 0;
  for (const [topic, keywords] of TOPIC_RULES) {
    const score = keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score > best) {
      best = score;
      winner = topic;
    }
  }
  return winner;
}

function whyItMatters(topic) {
  const map = {
    'Artificial Intelligence': 'It can change how people build software, automate work and evaluate the reliability of AI systems.',
    Technology: 'It may affect the tools, infrastructure and products people use or build next.',
    Science: 'It adds evidence that can influence future experiments, engineering decisions and research directions.',
    Health: 'It may improve understanding of health and medicine, but research findings should not be treated as personal medical advice.',
    Psychology: 'It can improve how we think about learning, behaviour, decision-making and human performance.',
    Space: 'It adds to our understanding of the universe and can shape the priorities of future missions and observations.',
    Finance: 'It may affect how people understand markets, risk, saving, investment or economic behaviour.',
    Business: 'It can reveal shifts in products, customers, competition and how companies create value.',
  };
  return map[topic] || 'It may be useful context for understanding what is changing in this field.';
}

function expertNote(source, summary) {
  if (source === 'Hacker News') {
    return 'This item is a technology-news signal rather than peer-reviewed evidence. Evaluate the original article, author, primary sources and any technical claims before relying on it.';
  }
  if (source === 'PubMed') {
    return `${summary} PubMed indexing does not by itself establish causality or clinical guidance; study design, sample size, effect size and limitations still matter.`;
  }
  return `${summary} This is a research preprint signal. Check the paper's methods, evaluation, limitations and revision status before treating the result as established evidence.`;
}

function normaliseDate(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

async function fetchArxiv() {
  const query = encodeURIComponent('(cat:cs.AI OR cat:cs.LG OR cat:stat.ML OR cat:astro-ph OR cat:physics OR cat:q-bio)');
  const url = `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=6&sortBy=submittedDate&sortOrder=descending`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NOVA-Knowledge/0.2 (research discovery feed)' },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`arXiv ${response.status}`);
  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => match[1]);
  return entries.map((entry, index) => {
    const title = tag(entry, 'title');
    const summary = truncate(tag(entry, 'summary'));
    const authors = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi)]
      .map((m) => cleanText(m[1]))
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    const rawUrl = tag(entry, 'id');
    const topic = classifyTopic(`${title} ${summary}`);
    return {
      id: `arxiv-${rawUrl.split('/').pop() || index}`,
      title,
      source: 'arXiv',
      topic,
      authors: authors || 'arXiv researchers',
      summary: summary || 'Open the original arXiv record for the paper abstract and full research context.',
      why: whyItMatters(topic),
      expert: expertNote('arXiv', summary),
      url: rawUrl || 'https://arxiv.org/',
      publishedAt: normaliseDate(tag(entry, 'published')),
      score: 84 - index,
      live: true,
    };
  }).filter((item) => item.title);
}

function pubmedDate(article) {
  const pubDate = article.match(/<PubDate>([\s\S]*?)<\/PubDate>/i)?.[1] || '';
  const year = tag(pubDate, 'Year');
  const month = tag(pubDate, 'Month');
  const day = tag(pubDate, 'Day');
  const medline = tag(pubDate, 'MedlineDate');
  if (year) return normaliseDate(`${day || '01'} ${month || 'Jan'} ${year}`);
  if (medline) return normaliseDate(medline);
  return new Date().toISOString();
}

async function fetchPubMed() {
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const params = new URLSearchParams({
    db: 'pubmed',
    retmode: 'json',
    retmax: '5',
    sort: 'date',
    tool: 'novaknowledge',
    term: '("artificial intelligence"[Title/Abstract] OR "machine learning"[Title/Abstract] OR sleep[Title/Abstract] OR psychology[Title/Abstract] OR technology[Title/Abstract])',
  });
  if (process.env.NCBI_CONTACT_EMAIL) params.set('email', process.env.NCBI_CONTACT_EMAIL);

  const searchResponse = await fetch(`${base}/esearch.fcgi?${params.toString()}`, { signal: AbortSignal.timeout(9000) });
  if (!searchResponse.ok) throw new Error(`PubMed search ${searchResponse.status}`);
  const searchData = await searchResponse.json();
  const ids = searchData?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const fetchParams = new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'xml', tool: 'novaknowledge' });
  if (process.env.NCBI_CONTACT_EMAIL) fetchParams.set('email', process.env.NCBI_CONTACT_EMAIL);
  const detailsResponse = await fetch(`${base}/efetch.fcgi?${fetchParams.toString()}`, { signal: AbortSignal.timeout(9000) });
  if (!detailsResponse.ok) throw new Error(`PubMed fetch ${detailsResponse.status}`);
  const xml = await detailsResponse.text();
  const articles = [...xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/gi)].map((match) => match[1]);

  return articles.map((article, index) => {
    const pmid = tag(article, 'PMID');
    const title = tag(article, 'ArticleTitle');
    const abstractParts = [...article.matchAll(/<AbstractText(?:\s[^>]*)?>([\s\S]*?)<\/AbstractText>/gi)].map((m) => cleanText(m[1]));
    const summary = truncate(abstractParts.join(' ')) || 'This PubMed record is newly indexed. Open the source for the complete abstract, publication details and study context.';
    const authorBlocks = [...article.matchAll(/<Author(?:\s[^>]*)?>([\s\S]*?)<\/Author>/gi)].map((m) => m[1]);
    const authors = authorBlocks.slice(0, 3).map((author) => [tag(author, 'ForeName'), tag(author, 'LastName')].filter(Boolean).join(' ')).filter(Boolean).join(', ');
    const topic = classifyTopic(`${title} ${summary}`);
    return {
      id: `pubmed-${pmid || index}`,
      title,
      source: 'PubMed',
      topic,
      authors: authors || 'PubMed authors',
      summary,
      why: whyItMatters(topic),
      expert: expertNote('PubMed', summary),
      url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : 'https://pubmed.ncbi.nlm.nih.gov/',
      publishedAt: pubmedDate(article),
      score: 86 - index,
      live: true,
    };
  }).filter((item) => item.title);
}

async function fetchHackerNews() {
  const root = 'https://hacker-news.firebaseio.com/v0';
  const topResponse = await fetch(`${root}/topstories.json`, { signal: AbortSignal.timeout(7000) });
  if (!topResponse.ok) throw new Error(`Hacker News ${topResponse.status}`);
  const ids = (await topResponse.json()).slice(0, 14);
  const stories = await Promise.all(ids.map(async (id) => {
    try {
      const response = await fetch(`${root}/item/${id}.json`, { signal: AbortSignal.timeout(7000) });
      return response.ok ? response.json() : null;
    } catch {
      return null;
    }
  }));

  return stories
    .filter((story) => story?.type === 'story' && story.title && story.url)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 6)
    .map((story) => {
      const topic = classifyTopic(story.title);
      const summary = `A currently popular Hacker News story links to this topic. The story has ${story.score || 0} points and ${story.descendants || 0} comments at the time NOVA refreshed the feed.`;
      return {
        id: `hn-${story.id}`,
        title: cleanText(story.title),
        source: 'Hacker News',
        topic,
        authors: story.by ? `Shared by ${story.by}` : 'Hacker News community',
        summary,
        why: whyItMatters(topic),
        expert: expertNote('Hacker News', summary),
        url: story.url,
        publishedAt: new Date((story.time || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        score: Math.min(99, 70 + Math.round((story.score || 0) / 25)),
        live: true,
      };
    });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  const settled = await Promise.allSettled([fetchArxiv(), fetchPubMed(), fetchHackerNews()]);
  const labels = ['arXiv', 'PubMed', 'Hacker News'];
  const items = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const sourceErrors = settled
    .map((result, index) => result.status === 'rejected' ? `${labels[index]}: ${result.reason?.message || 'unavailable'}` : null)
    .filter(Boolean);

  items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  if (!items.length) {
    return res.status(503).json({ error: 'Live sources are temporarily unavailable', sourceErrors });
  }

  return res.status(200).json({
    items,
    generatedAt: new Date().toISOString(),
    sourceErrors,
    sources: {
      arxiv: items.filter((item) => item.source === 'arXiv').length,
      pubmed: items.filter((item) => item.source === 'PubMed').length,
      hackerNews: items.filter((item) => item.source === 'Hacker News').length,
    },
  });
}
