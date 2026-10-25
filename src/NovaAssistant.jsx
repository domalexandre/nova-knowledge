import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BrainCircuit, LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import './ai.css';
import { supabase } from './supabase.js';

const LEVELS = ['Simple', 'Professional', 'Expert'];

function localExplanation(item, level) {
  if (level === 'Simple') return `${item.summary} In plain English: ${item.why}`;
  if (level === 'Professional') {
    const why = item.why || 'the finding may be useful context for this field.';
    return `${item.summary} The practical significance is that ${why.charAt(0).toLowerCase()}${why.slice(1)} Treat this as a signal to investigate rather than a guaranteed real-world outcome.`;
  }
  return item.expert || `${item.summary} Review the original source, methodology, evidence quality and limitations before relying on the claim.`;
}

export default function NovaAssistant({ item, initialMode = 'explain', onClose, onAIResult }) {
  const [mode, setMode] = useState(initialMode);
  const [level, setLevel] = useState('Simple');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const askInputRef = useRef(null);

  useEffect(() => {
    setMode(initialMode);
    setQuestion('');
    setAnswer('');
    setError('');
    setMeta(null);
  }, [item?.id, initialMode]);

  useEffect(() => {
    if (mode === 'ask') setTimeout(() => askInputRef.current?.focus(), 80);
  }, [mode]);

  if (!item) return null;

  const requestAI = async (requestMode) => {
    if (requestMode === 'ask' && question.trim().length < 3) {
      setError('Write a question first.');
      askInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError('');
    setAnswer('');
    setMeta(null);

    try {
      let accessToken = '';
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        accessToken = data?.session?.access_token || '';
      }

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          mode: requestMode,
          level,
          question: requestMode === 'ask' ? question.trim() : '',
          item,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.detail || `AI request failed: ${response.status}`);
      setAnswer(data.answer || 'No answer returned.');
      const resultMeta = {
        model: data.model,
        cached: Boolean(data.cached),
        remaining: data.remaining,
        usage: data.usage || null,
      };
      setMeta(resultMeta);
      onAIResult?.(requestMode, resultMeta);
    } catch (requestError) {
      setError(requestError.message || 'NOVA AI could not answer right now.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setAnswer('');
    setError('');
    setMeta(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal nova-ai-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close NOVA AI"><X /></button>

        <div className="nova-ai-heading">
          <span className="eyebrow"><BrainCircuit size={14} /> NOVA AI</span>
          <h2>{item.title}</h2>
          <p className="modal-source">{item.source} · {item.authors}</p>
        </div>

        <div className="assistant-tabs" role="tablist" aria-label="NOVA AI modes">
          <button className={mode === 'explain' ? 'selected' : ''} onClick={() => switchMode('explain')}>
            <Sparkles size={16} /> Explain
          </button>
          <button className={mode === 'ask' ? 'selected' : ''} onClick={() => switchMode('ask')}>
            <MessageCircle size={16} /> Ask NOVA
          </button>
        </div>

        <div className="level-tabs ai-level-tabs">
          {LEVELS.map((name) => (
            <button key={name} onClick={() => { setLevel(name); setAnswer(''); setError(''); }} className={level === name ? 'selected' : ''}>
              {name}
            </button>
          ))}
        </div>

        {mode === 'explain' ? (
          <div className="assistant-panel">
            <div className="local-explanation">
              <span className="assistant-kicker">QUICK EXPLANATION</span>
              <p>{localExplanation(item, level)}</p>
            </div>
            <button className="ai-generate-button" onClick={() => requestAI('explain')} disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
              {loading ? 'NOVA is analysing…' : 'Generate deeper AI explanation'}
            </button>
          </div>
        ) : (
          <div className="assistant-panel">
            <label className="ask-label" htmlFor="nova-question">Ask about this source</label>
            <div className="ask-composer">
              <textarea
                id="nova-question"
                ref={askInputRef}
                rows="3"
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 900))}
                placeholder="Example: What is the main limitation of this research?"
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') requestAI('ask');
                }}
              />
              <button onClick={() => requestAI('ask')} disabled={loading || question.trim().length < 3} aria-label="Ask NOVA">
                {loading ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
            <span className="composer-hint">NOVA answers from the source context shown in the feed, not from invented details.</span>
          </div>
        )}

        {error && <div className="ai-error">{error}</div>}

        {answer && (
          <div className="ai-answer" aria-live="polite">
            <div className="ai-answer-head">
              <span><Sparkles size={14} /> NOVA ANSWER</span>
              {meta?.cached && <small>cached</small>}
            </div>
            <p>{answer}</p>
            <div className="ai-answer-meta">
              <span>{meta?.model || 'AI model'}</span>
              {Number.isFinite(meta?.remaining) && <span>{meta.remaining} AI requests left this hour</span>}
            </div>
          </div>
        )}

        <div className="assistant-footer">
          <p>NOVA summarises the supplied source context. Verify important claims in the original source. Health content is not medical advice and finance content is not personalised investment advice.</p>
          <a href={item.url} target="_blank" rel="noreferrer">Open original <ArrowUpRight size={14} /></a>
        </div>
      </div>
    </div>
  );
}
