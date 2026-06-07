/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { parseYouTubeInput } from './utils';
import { AnalysisResponse, SearchResult, ParsedInput } from './types';
import { ResultsDisplay } from './components/ResultsDisplay';

type SearchBoxState = {
  id: string;
  text: string;
  chip: SearchResult | null;
  results: SearchResult[];
  searching: boolean;
  showDropdown: boolean;
};

const CACHE: Record<string, SearchResult[]> = {};

export default function App() {
  const [boxes, setBoxes] = useState<SearchBoxState[]>([{ id: '1', text: '', chip: null, results: [], searching: false, showDropdown: false }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const debounceTimers = useRef<Record<string, any>>({});

  const addBox = () => setBoxes([...boxes, { id: Date.now().toString(), text: '', chip: null, results: [], searching: false, showDropdown: false }]);

  const removeBox = (id: string) => {
    if (boxes.length === 1) {
      setBoxes([{ id: Date.now().toString(), text: '', chip: null, results: [], searching: false, showDropdown: false }]);
      return;
    }
    setBoxes(boxes.filter(b => b.id !== id));
  };

  const updateBox = (id: string, updates: Partial<SearchBoxState>) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleTextChange = (id: string, newText: string) => {
    updateBox(id, { text: newText, chip: null, showDropdown: true });
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    if (!newText.trim() || newText.includes('youtube.com') || newText.includes('youtu.be') || newText.match(/^UC[-_a-zA-Z0-9]{22}$/)) {
      updateBox(id, { results: [], showDropdown: false, searching: false });
      return;
    }
    updateBox(id, { searching: true });
    debounceTimers.current[id] = setTimeout(async () => {
      if (CACHE[newText]) { updateBox(id, { results: CACHE[newText], searching: false }); return; }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(newText)}`);
        const results = await res.json();
        CACHE[newText] = results;
        setBoxes(prev => prev.map(b => b.id === id && b.text === newText ? { ...b, results, searching: false } : b));
      } catch (e) { updateBox(id, { searching: false }); }
    }, 500);
  };

  const selectChip = (boxId: string, result: SearchResult) => updateBox(boxId, { chip: result, text: '', showDropdown: false });

  const handleAnalyze = async () => {
    setError(''); setData(null);
    let parsedInputs: ParsedInput[] = [];
    for (const box of boxes) {
      if (box.chip) { parsedInputs.push({ type: 'channel', id: box.chip.id }); }
      else if (box.text.trim()) {
        const p = parseYouTubeInput(box.text);
        if (p.length > 0) parsedInputs.push(...p);
        else if (!box.text.includes(' ') && box.text.length > 1) {
          const handle = box.text.startsWith('@') ? box.text : '@' + box.text;
          parsedInputs.push({ type: 'channelHandle', handle });
        }
      }
    }
    if (parsedInputs.length === 0) { setError('Please provide at least one valid channel link, handle, or select a channel.'); return; }
    const unique: ParsedInput[] = []; const seen = new Set();
    for (const item of parsedInputs) {
      const key = item.type + '-' + (item.id || item.handle);
      if (!seen.has(key)) { seen.add(key); unique.push(item); }
    }
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: unique }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to analyze inputs');
      setData(result);
    } catch (err: any) { setError(err.message || 'An unexpected error occurred.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Sticky Header */}
      <header style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100, height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--text-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.1 2.7 12 2.7 12 2.7s-4.1 0-6.8.2c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.2v2c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.3 21.6 12 21.6 12 21.6s4.1 0 6.8-.3c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.1.3-4.2v-2C23.3 9.1 23 7 23 7zM9.7 15.5V8.2l8.1 3.7-8.1 3.6z"/></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>YT<span style={{ color: 'var(--accent)' }}>Stats</span></span>
        </div>
      </header>

      <div className="w-full max-w-[960px] mx-auto px-4 py-6 md:py-8 fade-in">

        {/* Input Card */}
        <div style={{ background: 'var(--bg-panel)', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            Channels · Playlists · Videos
          </div>

          <div className="space-y-2 mb-4">
            {boxes.map((box) => (
              <div key={box.id} className="relative">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 12px', height: '46px', transition: 'border-color 0.15s' }}>
                  {box.chip ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={box.chip.thumbnailUrl} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--border-color)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{box.chip.name}</span>
                      {box.chip.handle && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{box.chip.handle}</span>}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={box.text}
                      onChange={(e) => handleTextChange(box.id, e.target.value)}
                      placeholder="Search channel or paste YouTube link..."
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                      onFocus={() => updateBox(box.id, { showDropdown: true })}
                      onBlur={() => setTimeout(() => updateBox(box.id, { showDropdown: false }), 200)}
                    />
                  )}
                  <button onClick={() => removeBox(box.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>×</button>
                </div>

                {box.showDropdown && !box.chip && box.text.trim() && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 50, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                    {box.searching ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>Searching...</div>
                    ) : box.results.length > 0 ? (
                      <ul style={{ maxHeight: '240px', overflowY: 'auto', margin: 0, padding: '4px', listStyle: 'none' }}>
                        {box.results.map((res) => (
                          <li key={res.id} onMouseDown={() => selectChip(box.id, res)} style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-base)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <img src={res.thumbnailUrl} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="" />
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{res.name}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{res.handle || res.id}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>Press Enter to use as link or handle</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={addBox} style={{ height: '42px', padding: '0 16px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-secondary)', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Add Channel
            </button>
            <button onClick={handleAnalyze} disabled={loading} style={{ height: '42px', padding: '0 22px', background: 'var(--text-primary)', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              {loading ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} /> : <Search size={14} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }} className="fade-in">
            <div className="progress-bar" style={{ maxWidth: '300px', margin: '0 auto 16px' }}></div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Fetching data, this may take a moment...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px', color: '#dc2626' }} className="fade-in">
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Error</p>
              <p style={{ fontSize: '13px', color: '#ef4444' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && !error && data && <div className="fade-in"><ResultsDisplay data={data} /></div>}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
