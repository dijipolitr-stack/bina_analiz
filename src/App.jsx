import { useState, useCallback } from "react";

const S = {
  card: { background: '#fff', border: '1px solid #e0dfd7', borderRadius: 12, padding: '16px 18px', marginBottom: 12 },
  section: { background: '#f0efe8', borderRadius: 12, padding: '16px 18px', marginBottom: 16 },
  label: { fontSize: 11, color: '#666', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  metric: { fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  metricVal: { fontSize: 16, fontWeight: 500, fontFamily: 'monospace' },
  badge: (bg, color) => ({ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: bg, color }),
};

function formatTL(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
}

function ScoreBadge({ score }) {
  if (!score) return null;
  const [bg, color, label] =
    score >= 80 ? ['#d1fae5', '#065f46', `Mükemmel (${score})`] :
    score >= 60 ? ['#dbeafe', '#1e40af', `İyi (${score})`] :
    score >= 40 ? ['#fef3c7', '#92400e', `Orta (${score})`] :
    ['#fee2e2', '#991b1b', `Zayıf (${score})`];
  return <span style={S.badge(bg, color)}>{label}</span>;
}

function RecBadge({ rec }) {
  if (!rec) return null;
  const [bg, color, label] =
    rec === 'al' ? ['#d1fae5', '#065f46', '✓ Al'] :
    rec === 'bekle' ? ['#fef3c7', '#92400e', '⏸ Bekle'] :
    ['#fee2e2', '#991b1b', '✗ Kaçın'];
  return <span style={S.badge(bg, color)}>{label}</span>;
}

function Step({ text, state }) {
  const color = state === 'error' ? '#dc2626' : state === 'done' ? '#059669' : state === 'active' ? '#d97706' : '#aaa';
  const icon = state === 'error' ? '✗' : state === 'done' ? '✓' : state === 'active' ? '◉' : '○';
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13, color }}>
      <span style={{ minWidth: 16, fontWeight: 600 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function PropertyCard({ prop, onDelete }) {
  const [open, setOpen] = useState(false);
  const a = prop.analysis;
  const amortYil = a?.amortizationMonths ? (a.amortizationMonths / 12).toFixed(1) : null;
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{prop.title || 'İlan'}</span>
            {a?.score && <ScoreBadge score={a.score} />}
            {a?.recommendation && <RecBadge rec={a.recommendation} />}
          </div>
          <div style={{ fontSize: 11, color: '#777', marginBottom: 10 }}>
            {[prop.district, prop.location].filter(Boolean).join(', ')}
            {prop.type && <> · {prop.type}</>}
            {prop.buildYear && <> · {prop.buildYear} yapı ({new Date().getFullYear() - prop.buildYear} yaş)</>}
            {prop.unitCount && <> · {prop.unitCount} bağ. bölüm</>}
            {prop.sqm && <> · {prop.sqm} m²</>}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            {prop.salePrice && (
              <div>
                <div style={S.metric}>Satış Bedeli</div>
                <div style={S.metricVal}>{formatTL(prop.salePrice)}</div>
              </div>
            )}
            {a?.estimatedMonthlyRent && (
              <div>
                <div style={S.metric}>Tahmini Kira/ay</div>
                <div style={{ ...S.metricVal, color: '#059669' }}>{formatTL(a.estimatedMonthlyRent)}</div>
              </div>
            )}
            {a?.amortizationMonths && (
              <div>
                <div style={S.metric}>Amortisman</div>
                <div style={{ ...S.metricVal, color: amortYil < 15 ? '#059669' : amortYil < 20 ? '#d97706' : '#dc2626' }}>
                  {a.amortizationMonths} ay <span style={{ fontSize: 12, fontWeight: 400 }}>({amortYil} yıl)</span>
                </div>
              </div>
            )}
            {a?.grossYield && (
              <div>
                <div style={S.metric}>Brüt Getiri</div>
                <div style={S.metricVal}>%{a.grossYield}</div>
              </div>
            )}
          </div>
          {a?.summary && (
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.65, borderLeft: '2px solid #ddd', paddingLeft: 10, marginBottom: 8 }}>
              {a.summary}
            </div>
          )}
          {open && a && (
            <div style={{ marginTop: 8, background: '#f5f4f0', borderRadius: 8, padding: '10px 12px', fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px' }}>
              {a.buildingAgeRisk && <div><b>Yapı yaşı:</b> {a.buildingAgeRisk}</div>}
              {a.unitCountAdvantage && <div><b>Bağ. bölüm:</b> {a.unitCountAdvantage}</div>}
              {a.riskLevel && <div><b>Risk:</b> {a.riskLevel}</div>}
              {prop.sqm && prop.salePrice && <div><b>m² fiyatı:</b> {formatTL(Math.round(prop.salePrice / prop.sqm))}/m²</div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {prop.url && <a href={prop.url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>↗ İlanı Gör</a>}
            {a && <button onClick={() => setOpen(o => !o)} style={{ fontSize: 11, border: 'none', background: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>{open ? '▲ Daralt' : '▼ Detaylar'}</button>}
          </div>
        </div>
        <button onClick={() => onDelete(prop.id)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, color: '#dc2626', alignSelf: 'flex-start' }}>🗑️</button>
      </div>
    </div>
  );
}

// API çağrısı — /api/claude proxy'si üzerinden
async function callClaude(messages, useWebSearch) {
  const body = { model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages };
  if (useWebSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map(b => b.text || '').join('') || '';
}

const ILAN_TIPLERI = ['Tümü', 'işyeri', 'ofis', 'mağaza', 'plaza', 'depo', 'arsa üzeri bina'];

export default function App() {
  const [criteria, setCriteria] = useState({ location: '', minPrice: '', maxPrice: '', type: 'Tümü', minSqm: '', maxSqm: '', count: '5', filterUrl: '', pageSource: '' });
  const [properties, setProperties] = useState([]);
  const [steps, setSteps] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setCriteria(c => ({ ...c, [k]: v }));

  const addStep = useCallback((text, state = 'active') => {
    setSteps(s => {
      const updated = s.map((st, i) => i === s.length - 1 && st.state === 'active' ? { ...st, state: 'done' } : st);
      return [...updated, { text, state }];
    });
  }, []);

  const finishLastStep = useCallback((state = 'done') => {
    setSteps(s => s.map((st, i) => i === s.length - 1 ? { ...st, state } : st));
  }, []);

  const run = useCallback(async () => {
    if (!criteria.location.trim()) { setError('Lütfen konum girin.'); return; }
    setError(''); setRunning(true); setSteps([]); setProperties([]);
    try {
      addStep('İlan URL\'leri çıkarılıyor...');

      let listings = [];

      if (criteria.pageSource && criteria.pageSource.length > 100) {
        // Extract URLs directly from pasted page source
        const urlRegex = /\/ilan\/[a-zA-Z0-9\-,\.]+\/detay/g;
        const matches = criteria.pageSource.match(urlRegex) || [];
        const unique = [...new Set(matches)].map(u => ({
          url: 'https://www.sahibinden.com' + u.replace('/detay', ''),
          title: ''
        }));
        if (!unique.length) throw new Error('Yapıştırdığınız içerikte sahibinden.com ilan URL\'si bulunamadı. Ctrl+U ile kaynak kodunu kopyaladığınızdan emin olun.');
        listings = unique.slice(0, Number(criteria.count));
        addStep(listings.length + ' ilan URL\'si bulundu.');
      } else {
        throw new Error('Lütfen sahibinden.com sayfa kaynağını yapıştırın. Sahibinden.com\'u açın → filtreleyin → Ctrl+U → Ctrl+A → Ctrl+C → aşağıdaki kutuya yapıştırın.');
      }


      finishLastStep('done');
      addStep(`${listings.length} ilan bulundu. Detaylar okunuyor…`);

      for (let i = 0; i < Math.min(listings.length, Number(criteria.count)); i++) {
        const listing = listings[i];
        addStep(`(${i + 1}/${listings.length}) ${(listing.title || listing.url || '').substring(0, 55)}…`);
        try {
          const detailText = await callClaude([{ role: 'user', content: `Şu sahibinden.com ilanına git ve tüm bilgileri çıkar: ${listing.url}\nSADECE JSON:\n{"title":"","salePrice":0,"district":"","location":"","type":"","buildYear":null,"unitCount":null,"sqm":null,"extraFeatures":[]}` }], true);
          const dj = detailText.match(/\{[\s\S]*\}/);
          if (!dj) { finishLastStep('error: JSON yok. Yanit: ' + detailText.substring(0,100)); continue; }
          const detail = JSON.parse(dj[0]);
          if (!detail.salePrice || detail.salePrice < 10000) { finishLastStep('error: Fiyat yok. ' + JSON.stringify(detail).substring(0,100)); continue; }

          const buildingAge = detail.buildYear ? new Date().getFullYear() - detail.buildYear : null;
          const analysisText = await callClaude([{ role: 'user', content: `Sen bir Türk gayrimenkul yatırım analistsin.\nBina: ${detail.type} · ${detail.district}${detail.location ? ', ' + detail.location : ''} · ${new Intl.NumberFormat('tr-TR').format(detail.salePrice)} TL · Yapı: ${detail.buildYear || '?'}${buildingAge ? ` (${buildingAge} yaş)` : ''} · Bölüm: ${detail.unitCount || '?'} · Alan: ${detail.sqm ? detail.sqm + ' m²' : '?'}\nSADECE JSON:\n{"estimatedMonthlyRent":0,"rentRangeMin":0,"rentRangeMax":0,"grossYield":0,"amortizationMonths":0,"score":0,"riskLevel":"","recommendation":"","buildingAgeRisk":"","unitCountAdvantage":"","summary":""}` }]);
          const aj = analysisText.match(/\{[\s\S]*\}/);
          const analysis = aj ? JSON.parse(aj[0]) : null;

          setProperties(ps => [...ps, { id: Date.now() + i, url: listing.url, ...detail, analysis }]);
          finishLastStep('done');
        } catch { finishLastStep('error'); }
        await new Promise(r => setTimeout(r, 200));
      }
      addStep('Tüm ilanlar analiz edildi.', 'done');
    } catch (e) {
      finishLastStep('error');
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [criteria, addStep, finishLastStep]);

  const handleDelete = id => setProperties(ps => ps.filter(p => p.id !== id));
  const analyzed = properties.filter(p => p.analysis);
  const avgAmort = analyzed.length ? Math.round(analyzed.reduce((s, p) => s + (p.analysis.amortizationMonths || 0), 0) / analyzed.length) : null;
  const sorted = [...analyzed].sort((a, b) => (b.analysis.score || 0) - (a.analysis.score || 0));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>🏢 Ticari Bina Yatırım Tarayıcı</h1>
        <p style={{ fontSize: 13, color: '#666' }}>Konum ve bütçe gir → Sahibinden.com otomatik taranır → Tüm ilanlar analiz edilir</p>
      </div>

      <div style={S.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Konum*</label>
            <input value={criteria.location} onChange={e => set('location', e.target.value)} placeholder="Örn: Kadıköy, İstanbul" style={{ width: '100%' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Sahibinden.com Sayfa Kaynağı*</label>
            <textarea value={criteria.pageSource} onChange={e => set('pageSource', e.target.value)}
              placeholder={'1) sahibinden.com/satilik-bina/istanbul adresini açın\n2) Filtreleyin (fiyat, alan vb.)\n3) Klavyeden Ctrl+U basın (sayfa kaynağı açılır)\n4) Ctrl+A ile tümünü seçin\n5) Ctrl+C ile kopyalayın\n6) Buraya Ctrl+V ile yapıştırın'}
              rows={5} style={{ width: '100%', fontFamily: 'monospace', fontSize: 11 }} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              💡 Kaynak kodundan ilan URL'leri otomatik çıkarılır — {criteria.pageSource ? (criteria.pageSource.match(/\/ilan\/[a-zA-Z0-9\-,\.]+\/detay/g) || []).length + ' ilan URL\'i tespit edildi' : 'henüz yapıştırılmadı'}
            </div>
          </div>
          <div><label style={S.label}>Min Fiyat (₺)</label><input type="number" value={criteria.minPrice} onChange={e => set('minPrice', e.target.value)} placeholder="5000000" style={{ width: '100%' }} /></div>
          <div><label style={S.label}>Max Fiyat (₺)</label><input type="number" value={criteria.maxPrice} onChange={e => set('maxPrice', e.target.value)} placeholder="50000000" style={{ width: '100%' }} /></div>
          <div><label style={S.label}>Bina Tipi</label><select value={criteria.type} onChange={e => set('type', e.target.value)} style={{ width: '100%' }}>{ILAN_TIPLERI.map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label style={S.label}>Min Alan (m²)</label><input type="number" value={criteria.minSqm} onChange={e => set('minSqm', e.target.value)} placeholder="200" style={{ width: '100%' }} /></div>
          <div><label style={S.label}>Max Alan (m²)</label><input type="number" value={criteria.maxSqm} onChange={e => set('maxSqm', e.target.value)} placeholder="2000" style={{ width: '100%' }} /></div>
          <div><label style={S.label}>İlan Sayısı</label><select value={criteria.count} onChange={e => set('count', e.target.value)} style={{ width: '100%' }}>{['3','5','10','15'].map(n => <option key={n} value={n}>{n} ilan</option>)}</select></div>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: '#991b1b', background: '#fee2e2', borderRadius: 6, padding: '8px 12px' }}>{error}</div>}
        <div style={{ marginTop: 14 }}>
          <button onClick={run} disabled={running} style={{ padding: '10px 24px', borderRadius: 8, fontWeight: 500, fontSize: 14, border: '1px solid #ccc' }}>
            {running ? '⏳ Taranıyor…' : '🔍 Otomatik Tara ve Analiz Et'}
          </button>
        </div>
      </div>

      {steps.length > 0 && (
        <div style={{ ...S.section, marginBottom: 16 }}>
          {steps.map((s, i) => <Step key={i} text={s.text} state={s.state} />)}
        </div>
      )}

      {analyzed.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[['Bulunan', properties.length], ['Analiz', analyzed.length], ['Ort. Amortisman', avgAmort ? `${avgAmort} ay` : '—'], ['Ort. Süre', avgAmort ? `${(avgAmort/12).toFixed(1)} yıl` : '—']].map(([label, value]) => (
            <div key={label} style={{ background: '#f0efe8', borderRadius: 8, padding: '10px 13px' }}>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 500, fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 1 && (
        <div style={{ ...S.card, overflowX: 'auto', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: '#666' }}>Karşılaştırma (skora göre)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ borderBottom: '1px solid #eee' }}>{['#','İlan','Satış','Kira/ay','Amortisman','Getiri','Skor','Öneri'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {sorted.map((p, i) => {
                const ay = p.analysis.amortizationMonths;
                const yil = ay ? (ay/12).toFixed(1) : null;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0efe8', background: i === 0 ? 'rgba(5,150,105,0.04)' : 'transparent' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 500, color: i === 0 ? '#059669' : '#aaa' }}>{i+1}</td>
                    <td style={{ padding: '7px 8px', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.url ? <a href={p.url} target="_blank" rel="noreferrer" style={{ color: '#1a1a18', textDecoration: 'none' }}>{(p.title||p.district||'').substring(0,28)}</a> : (p.title||'').substring(0,28)}
                    </td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{formatTL(p.salePrice)}</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: '#059669', whiteSpace: 'nowrap' }}>{formatTL(p.analysis.estimatedMonthlyRent)}</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace', fontWeight: 500, whiteSpace: 'nowrap', color: yil < 15 ? '#059669' : yil < 20 ? '#d97706' : '#dc2626' }}>{ay} ay <span style={{ fontWeight: 400, fontSize: 11 }}>({yil}y)</span></td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>%{p.analysis.grossYield}</td>
                    <td style={{ padding: '7px 8px' }}><ScoreBadge score={p.analysis.score} /></td>
                    <td style={{ padding: '7px 8px' }}><RecBadge rec={p.analysis.recommendation} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {properties.length === 0 && steps.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed #ddd', borderRadius: 12, color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontWeight: 500, marginBottom: 6, color: '#666' }}>Konum ve bütçe girin</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>Sahibinden.com otomatik taranır, ilanlar bulunur<br/>ve her biri için kira tahmini + amortisman analizi yapılır.</div>
        </div>
      )}

      <div>{properties.map(p => <PropertyCard key={p.id} prop={p} onDelete={handleDelete} />)}</div>
    </div>
  );
}
