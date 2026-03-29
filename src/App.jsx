import { useState, useCallback } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTL(n) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

function extractListings(src, type) {
  // type: "satilik" | "kiralik"
  const urlRegex = /\/ilan\/[a-zA-Z0-9\-,\.]+\/detay/g;
  const matches = src.match(urlRegex) || [];
  const idRegex = /-(\d{8,})\/detay/;

  return [...new Set(matches)].map(u => {
    const idMatch = u.match(idRegex);
    const id = idMatch ? idMatch[1] : "";
    const idx = id ? src.indexOf(id) : -1;
    const slice = idx > -1 ? src.substring(Math.max(0, idx - 800), idx + 1200) : "";

    // Price
    let price = 0;
    for (const p of [/data-price="(\d+)"/, /"price":(\d{4,})/, /([\d]{1,3}(?:\.[\d]{3})+)\s*TL/]) {
      const m = slice.match(p);
      if (m) { price = parseInt(m[1].replace(/\./g, "")); if (price > 1000) break; }
    }

    // m²
    let sqm = null;
    const sqmPatterns = [
      /data-m2="(\d+)"/,
      /"m2":(\d+)/,
      /"netM2":(\d+)/,
      /"grossM2":(\d+)/,
      /netM2[^\d]*(\d+)/,
      /m2Value[^\d]*(\d+)/,
      /(\d+)\s*m²/,
      /(\d+)\s*m2/i,
      /"area":(\d+)/,
      /data-area="(\d+)"/,
    ];
    for (const p of sqmPatterns) {
      const m = slice.match(p);
      if (m) { const v = parseInt(m[1]); if (v > 10 && v < 100000) { sqm = v; break; } }
    }

    // Date
    let publishDate = null;
    for (const p of [/data-date="(\d{4}-\d{2}-\d{2})/, /data-update-date="(\d{4}-\d{2}-\d{2})/, /"date":"(\d{4}-\d{2}-\d{2})/]) {
      const m = slice.match(p);
      if (m) { publishDate = m[1]; break; }
    }

    return { url: "https://www.sahibinden.com" + u.replace("/detay", ""), id, price, sqm, publishDate };
  }).filter(l => l.price > 1000);
}

function calcRealRentStats(kiralikListings) {
  const perSqm = kiralikListings
    .filter(l => l.price > 0 && l.sqm > 0)
    .map(l => l.price / l.sqm);

  if (!perSqm.length) return null;

  perSqm.sort((a, b) => a - b);
  // Remove outliers (bottom 10%, top 10%)
  const trimmed = perSqm.slice(Math.floor(perSqm.length * 0.1), Math.ceil(perSqm.length * 0.9));
  if (!trimmed.length) return null;

  const avg = Math.round(trimmed.reduce((s, v) => s + v, 0) / trimmed.length);
  const min = Math.round(trimmed[0]);
  const max = Math.round(trimmed[trimmed.length - 1]);
  return { avgPerSqm: avg, minPerSqm: min, maxPerSqm: max, count: trimmed.length };
}

function parseTurkishDate(str) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
  const months = {"Ocak":0,"Şubat":1,"Mart":2,"Nisan":3,"Mayıs":4,"Haziran":5,"Temmuz":6,"Ağustos":7,"Eylül":8,"Ekim":9,"Kasım":10,"Aralık":11};
  const m = str.match(/(\d+)\s+(\w+)\s+(\d{4})/);
  if (m && months[m[2]] !== undefined) return new Date(parseInt(m[3]), months[m[2]], parseInt(m[1]));
  return null;
}

function daysAgo(dateStr) {
  const d = parseTurkishDate(dateStr);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ── Badges ────────────────────────────────────────────────────────────────────
function Badge({ label, bg, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: bg, color }}>{label}</span>;
}
function ScoreBadge({ score }) {
  if (!score) return null;
  return score >= 80 ? <Badge label={`Mükemmel · ${score}`} bg="#d1fae5" color="#065f46" /> :
    score >= 60 ? <Badge label={`İyi · ${score}`} bg="#dbeafe" color="#1e40af" /> :
    score >= 40 ? <Badge label={`Orta · ${score}`} bg="#fef3c7" color="#92400e" /> :
    <Badge label={`Zayıf · ${score}`} bg="#fee2e2" color="#991b1b" />;
}
function RecBadge({ rec }) {
  return rec === "al" ? <Badge label="✓ Al" bg="#d1fae5" color="#065f46" /> :
    rec === "bekle" ? <Badge label="⏸ Bekle" bg="#fef3c7" color="#92400e" /> :
    <Badge label="✗ Kaçın" bg="#fee2e2" color="#991b1b" />;
}
function AgeBadge({ days }) {
  if (days === null) return null;
  const label = days === 0 ? "Bugün" : days === 1 ? "Dün" : `${days} gün önce`;
  const [bg, color] = days <= 3 ? ["#d1fae5","#065f46"] : days <= 14 ? ["#fef3c7","#92400e"] : ["#f3f4f6","#6b7280"];
  return <Badge label={label} bg={bg} color={color} />;
}

function Step({ text, state }) {
  const color = state === "error" ? "#dc2626" : state === "done" ? "#059669" : "#d97706";
  const icon = state === "error" ? "✗" : state === "done" ? "✓" : "◉";
  return (
    <div style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: 12.5, color, lineHeight: 1.4 }}>
      <span style={{ minWidth: 14, fontWeight: 700 }}>{icon}</span>
      <span style={{ wordBreak: "break-all" }}>{text}</span>
    </div>
  );
}

function Metric({ label, val, sub, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "monospace", color: color || "#111" }}>
        {val}{sub && <span style={{ fontSize: 11, fontWeight: 400, color: "#888", marginLeft: 4 }}>({sub})</span>}
      </div>
    </div>
  );
}

// ── API ───────────────────────────────────────────────────────────────────────
async function callClaude(messages) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map(b => b.text || "").join("") || "";
}

// ── Property Card ─────────────────────────────────────────────────────────────
function PropCard({ prop, onDelete }) {
  const [open, setOpen] = useState(false);
  const a = prop.analysis;
  const amortYil = a?.amortizationMonths ? (a.amortizationMonths / 12).toFixed(1) : null;
  const days = prop.publishDate ? daysAgo(prop.publishDate) : null;

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e7df", borderRadius: 14, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{prop.title || "İlan"}</span>
            {a?.score && <ScoreBadge score={a.score} />}
            {a?.recommendation && <RecBadge rec={a.recommendation} />}
            {days !== null && <AgeBadge days={days} />}
            {prop.rentSource === "gercek" && <Badge label="Gerçek Kira" bg="#ede9fe" color="#5b21b6" />}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
            {[prop.district, prop.location].filter(Boolean).join(", ")}
            {prop.type && <> · {prop.type}</>}
            {prop.buildYear && <> · {prop.buildYear} yapı ({new Date().getFullYear() - prop.buildYear} yaş)</>}
            {prop.unitCount && <> · {prop.unitCount} bağ.bölüm</>}
            {prop.sqm && <> · {prop.sqm} m²</>}
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
            {prop.salePrice > 0 && <Metric label="Satış" val={fmtTL(prop.salePrice)} />}
            {a?.estimatedMonthlyRent > 0 && (
              <Metric label={prop.rentSource === "gercek" ? "Gerçek Kira/ay" : "Tahmini Kira/ay"}
                val={fmtTL(a.estimatedMonthlyRent)} color={prop.rentSource === "gercek" ? "#7c3aed" : "#059669"}
                sub={a.rentRangeMin && a.rentRangeMax ? `${fmtTL(a.rentRangeMin)}–${fmtTL(a.rentRangeMax)}` : null} />
            )}
            {a?.amortizationMonths > 0 && (
              <Metric label="Amortisman" val={`${a.amortizationMonths} ay`} sub={`${amortYil} yıl`}
                color={amortYil < 15 ? "#059669" : amortYil < 20 ? "#d97706" : "#dc2626"} />
            )}
            {a?.grossYield > 0 && <Metric label="Brüt Getiri" val={`%${a.grossYield}`} />}
          </div>
          {a?.summary && (
            <div style={{ fontSize: 12.5, color: "#555", lineHeight: 1.7, borderLeft: "3px solid #e8e7df", paddingLeft: 12, marginBottom: 10 }}>
              {a.summary}
            </div>
          )}
          {open && a && (
            <div style={{ background: "#f8f7f3", borderRadius: 8, padding: "10px 14px", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 16px", marginBottom: 10 }}>
              {a.buildingAgeRisk && <div><b>Yapı yaşı:</b> {a.buildingAgeRisk}</div>}
              {a.unitCountAdvantage && <div><b>Bağ.bölüm:</b> {a.unitCountAdvantage}</div>}
              {a.riskLevel && <div><b>Risk:</b> {a.riskLevel}</div>}
              {prop.sqm && prop.salePrice && <div><b>m² satış:</b> {fmtTL(Math.round(prop.salePrice / prop.sqm))}/m²</div>}
              {prop.rentStats && <div><b>Bölge kira ort.:</b> {fmtTL(prop.rentStats.avgPerSqm)}/m² ({prop.rentStats.count} ilan)</div>}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {prop.url && <a href={prop.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#185FA5" }}>↗ İlanı Gör</a>}
            {a && <button onClick={() => setOpen(o => !o)} style={{ fontSize: 12, border: "none", background: "none", cursor: "pointer", color: "#aaa", padding: 0 }}>{open ? "▲ Daralt" : "▼ Detaylar"}</button>}
          </div>
        </div>
        <button onClick={() => onDelete(prop.id)} style={{ fontSize: 13, padding: "5px 8px", border: "1px solid #eee", borderRadius: 8, background: "none", cursor: "pointer", color: "#dc2626", alignSelf: "flex-start" }}>✕</button>
      </div>
    </div>
  );
}

// ── Date filters ──────────────────────────────────────────────────────────────
const DATE_FILTERS = [
  { label: "Tüm ilanlar", days: null },
  { label: "Son 1 gün", days: 1 },
  { label: "Son 3 gün", days: 3 },
  { label: "Son 7 gün", days: 7 },
  { label: "Son 30 gün", days: 30 },
];

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [satilikSrc, setSatilikSrc] = useState("");
  const [kiralikSrc, setKiralikSrc] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDays, setMaxDays] = useState(null);
  const [properties, setProperties] = useState([]);
  const [steps, setSteps] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [rentStats, setRentStats] = useState(null);

  const addStep = useCallback((text, state = "active") => {
    setSteps(s => {
      const updated = s.map((st, i) => i === s.length - 1 && st.state === "active" ? { ...st, state: "done" } : st);
      return [...updated, { text, state }];
    });
  }, []);
  const finishLast = useCallback((state = "done") => {
    setSteps(s => s.map((st, i) => i === s.length - 1 ? { ...st, state } : st));
  }, []);

  const run = useCallback(async () => {
    if (!satilikSrc || satilikSrc.length < 100) { setError("Lütfen satılık ilanlar sayfa kaynağını yapıştırın."); return; }
    setError(""); setRunning(true); setSteps([]); setProperties([]); setRentStats(null);

    try {
      // ── 1. Kiralık verisinden gerçek kira ortalaması ──
      let realRentStats = null;
      if (kiralikSrc && kiralikSrc.length > 100) {
        addStep("Kiralık ilanlardan gerçek kira verisi hesaplanıyor...");
        const kiralikListings = extractListings(kiralikSrc, "kiralik");
        realRentStats = calcRealRentStats(kiralikListings);
        if (realRentStats) {
          setRentStats(realRentStats);
          finishLast("done");
          addStep(`${kiralikListings.length} kiralık ilan bulundu · Ort. kira: ${fmtTL(realRentStats.avgPerSqm)}/m² (${realRentStats.count} ilan)`, "done");
        } else {
          finishLast("error");
          addStep("Kiralık ilanlardan m² verisi çıkarılamadı, AI tahmini kullanılacak.");
        }
      }

      // ── 2. Satılık ilanları çıkar ──
      addStep("Satılık ilan URL'leri çıkarılıyor...");
      let listings = extractListings(satilikSrc, "satilik");
      if (!listings.length) throw new Error("URL bulunamadı. Ctrl+U ile kaynak kodunu kopyaladığınızdan emin olun.");

      // Filtrele
      if (minPrice) listings = listings.filter(l => !l.price || l.price >= parseInt(minPrice));
      if (maxPrice) listings = listings.filter(l => !l.price || l.price <= parseInt(maxPrice));
      if (maxDays !== null) listings = listings.filter(l => { const d = daysAgo(l.publishDate); return d !== null && d <= maxDays; });
      if (!listings.length) throw new Error("Filtrelerinize uyan ilan bulunamadı.");

      finishLast("done");
      addStep(`${listings.length} satılık ilan bulundu. Analiz başlıyor...`);

      // ── 3. Her ilanı analiz et ──
      for (let i = 0; i < listings.length; i++) {
        const l = listings[i];
        addStep(`(${i+1}/${listings.length}) ${l.url.substring(30, 72)}...`);

        try {
          // Gerçek kira varsa hesapla, yoksa AI'a tahmin ettir
          let rentInfo = "";
          let preCalcRent = null;
          let preCalcAmort = null;
          let preCalcYield = null;

          if (realRentStats && l.sqm) {
            preCalcRent = Math.round(l.sqm * realRentStats.avgPerSqm);
            preCalcAmort = l.price > 0 ? Math.round(l.price / preCalcRent) : null;
            preCalcYield = l.price > 0 ? Math.round((preCalcRent * 12 / l.price) * 1000) / 10 : null;
            rentInfo = `Gerçek kira verisi: bölge ort. ${realRentStats.avgPerSqm} TL/m², bina ${l.sqm} m², tahmini kira ${preCalcRent} TL/ay, amortisman ${preCalcAmort} ay, brüt getiri %${preCalcYield}. Bu değerleri kullan.`;
          } else if (realRentStats) {
            rentInfo = `Gerçek kira verisi: bölge ort. ${realRentStats.avgPerSqm} TL/m² (${realRentStats.minPerSqm}–${realRentStats.maxPerSqm} aralığı). m² bilgisi yoksa bu ortalamayı ve bina tipini kullanarak tahmin et.`;
          }

          const prompt =
            "Sen Türk gayrimenkul yatırım analistsin. " +
            "URL: " + l.url + ". " +
            (l.price > 10000 ? "Satış: " + l.price + " TL. " : "") +
            (l.sqm ? "Alan: " + l.sqm + " m². " : "") +
            (l.publishDate ? "İlan tarihi: " + l.publishDate + ". " : "") +
            rentInfo +
            " SADECE JSON: " +
            '{"title":"başlık","salePrice":' + (l.price||0) + ',"district":"ilçe","location":"mahalle","type":"tip",' +
            '"buildYear":null,"unitCount":null,"sqm":' + (l.sqm||"null") + ',' +
            '"estimatedMonthlyRent":' + (preCalcRent||0) + ',' +
            '"rentRangeMin":' + (preCalcRent ? Math.round(preCalcRent*0.85) : 0) + ',' +
            '"rentRangeMax":' + (preCalcRent ? Math.round(preCalcRent*1.15) : 0) + ',' +
            '"grossYield":' + (preCalcYield||0) + ',' +
            '"amortizationMonths":' + (preCalcAmort||0) + ',' +
            '"score":0,"riskLevel":"orta","recommendation":"bekle",' +
            '"buildingAgeRisk":"","unitCountAdvantage":"",' +
            '"summary":"3 cümle yatırım değerlendirmesi"}';

          const text = await callClaude([{ role: "user", content: prompt }]);
          const m = text.match(/\{[\s\S]*\}/);
          if (!m) { finishLast("error"); continue; }
          const r = JSON.parse(m[0]);
          if (!r.salePrice || r.salePrice < 10000) { finishLast("error"); continue; }

          setProperties(ps => [...ps, {
            id: Date.now() + i,
            url: l.url,
            publishDate: l.publishDate,
            rentSource: realRentStats ? "gercek" : "tahmin",
            rentStats: realRentStats,
            title: r.title, salePrice: r.salePrice,
            district: r.district, location: r.location,
            type: r.type, buildYear: r.buildYear,
            unitCount: r.unitCount, sqm: r.sqm || l.sqm,
            analysis: {
              estimatedMonthlyRent: r.estimatedMonthlyRent,
              rentRangeMin: r.rentRangeMin, rentRangeMax: r.rentRangeMax,
              grossYield: r.grossYield, amortizationMonths: r.amortizationMonths,
              score: r.score, riskLevel: r.riskLevel, recommendation: r.recommendation,
              buildingAgeRisk: r.buildingAgeRisk, unitCountAdvantage: r.unitCountAdvantage,
              summary: r.summary,
            }
          }]);
          finishLast("done");
        } catch (e) { finishLast("error"); }

        await new Promise(r => setTimeout(r, 3500));
      }
      addStep("Tüm ilanlar analiz edildi.", "done");
    } catch (e) {
      finishLast("error");
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [satilikSrc, kiralikSrc, minPrice, maxPrice, maxDays, addStep, finishLast]);

  const handleDelete = id => setProperties(ps => ps.filter(p => p.id !== id));
  const analyzed = properties.filter(p => p.analysis);
  const avgAmort = analyzed.length ? Math.round(analyzed.reduce((s, p) => s + (p.analysis.amortizationMonths||0), 0) / analyzed.length) : null;
  const sorted = [...analyzed].sort((a, b) =>
    sortBy === "score" ? (b.analysis.score||0) - (a.analysis.score||0) :
    sortBy === "amort" ? (a.analysis.amortizationMonths||999) - (b.analysis.amortizationMonths||999) :
    sortBy === "yield" ? (b.analysis.grossYield||0) - (a.analysis.grossYield||0) :
    sortBy === "date" ? (daysAgo(a.publishDate)||999) - (daysAgo(b.publishDate)||999) : 0
  );

  const satilikCount = satilikSrc ? (satilikSrc.match(/\/ilan\/[a-zA-Z0-9\-,\.]+\/detay/g)||[]).length : 0;
  const kiralikCount = kiralikSrc ? (kiralikSrc.match(/\/ilan\/[a-zA-Z0-9\-,\.]+\/detay/g)||[]).length : 0;

  const labelStyle = { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 };
  const inputStyle = { width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid #ddd", padding: "8px 12px", fontSize: 13, background: "#fff" };
  const taStyle = { ...inputStyle, fontFamily: "monospace", fontSize: 11.5, resize: "vertical" };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: -0.5 }}>🏢 Ticari Bina Yatırım Tarayıcı</h1>
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Gerçek kira verisiyle amortisman hesabı · Sahibinden.com kaynak kodu</p>
      </div>

      <div style={{ background: "#f8f7f3", borderRadius: 14, padding: "18px 20px", marginBottom: 18 }}>

        {/* Two-column source input */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>
              1️⃣ Satılık Bina Sayfa Kaynağı *
            </label>
            <textarea value={satilikSrc} onChange={e => setSatilikSrc(e.target.value)} rows={5}
              placeholder={"sahibinden.com/satilik-bina/istanbul\n→ Ctrl+U → Ctrl+A → Ctrl+C → buraya Ctrl+V"}
              style={taStyle} />
            <div style={{ fontSize: 11.5, color: satilikCount > 0 ? "#059669" : "#aaa", marginTop: 4, fontWeight: satilikCount > 0 ? 600 : 400 }}>
              {satilikCount > 0 ? `✓ ${satilikCount} satılık ilan tespit edildi` : "Henüz yapıştırılmadı"}
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              2️⃣ Kiralık Bina Sayfa Kaynağı <span style={{ fontWeight: 400, color: "#bbb" }}>(gerçek kira için)</span>
            </label>
            <textarea value={kiralikSrc} onChange={e => setKiralikSrc(e.target.value)} rows={5}
              placeholder={"sahibinden.com/kiralik-bina/istanbul\n→ Ctrl+U → Ctrl+A → Ctrl+C → buraya Ctrl+V\n\nBoş bırakırsanız AI tahmin eder."}
              style={taStyle} />
            <div style={{ fontSize: 11.5, color: kiralikCount > 0 ? "#7c3aed" : "#aaa", marginTop: 4, fontWeight: kiralikCount > 0 ? 600 : 400 }}>
              {kiralikCount > 0 ? `✓ ${kiralikCount} kiralık ilan tespit edildi` : "Boş bırakılırsa AI tahmini kullanılır"}
            </div>
          </div>
        </div>

        {/* Rent stats banner */}
        {rentStats && (
          <div style={{ background: "#ede9fe", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "#5b21b6" }}>📊 Gerçek Kira Verisi</span>
            <span style={{ color: "#5b21b6" }}>Ort: <b>{fmtTL(rentStats.avgPerSqm)}/m²</b></span>
            <span style={{ color: "#5b21b6" }}>Aralık: {fmtTL(rentStats.minPerSqm)}–{fmtTL(rentStats.maxPerSqm)}/m²</span>
            <span style={{ color: "#5b21b6" }}>{rentStats.count} ilan baz alındı</span>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px 14px", marginBottom: 14 }}>
          <div><label style={labelStyle}>Min Fiyat (₺)</label><input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="5.000.000" style={inputStyle} /></div>
          <div><label style={labelStyle}>Max Fiyat (₺)</label><input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="100.000.000" style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>İlan Tarihi</label>
            <select value={maxDays === null ? "null" : maxDays} onChange={e => setMaxDays(e.target.value === "null" ? null : parseInt(e.target.value))} style={inputStyle}>
              {DATE_FILTERS.map(f => <option key={String(f.days)} value={f.days === null ? "null" : f.days}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={{ fontSize: 12.5, color: "#991b1b", background: "#fee2e2", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>{error}</div>}

        <button onClick={run} disabled={running || !satilikSrc}
          style={{ padding: "11px 28px", borderRadius: 10, cursor: running ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, border: "none", background: running ? "#ccc" : "#111", color: "#fff" }}>
          {running ? "⏳ Analiz ediliyor..." : "🔍 Filtrele ve Analiz Et"}
        </button>
      </div>

      {steps.length > 0 && (
        <div style={{ background: "#f8f7f3", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          {steps.map((s, i) => <Step key={i} text={s.text} state={s.state} />)}
        </div>
      )}

      {analyzed.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[["Bulunan", properties.length], ["Analiz", analyzed.length], ["Ort. Amortisman", avgAmort ? `${avgAmort} ay` : "—"], ["Ort. Süre", avgAmort ? `${(avgAmort/12).toFixed(1)} yıl` : "—"]].map(([label, val]) => (
            <div key={label} style={{ background: "#f8f7f3", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 1 && (
        <div style={{ background: "#fff", border: "1px solid #e8e7df", borderRadius: 14, padding: "14px 16px", marginBottom: 18, overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Karşılaştırma</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["score","Skor"],["amort","Amortisman"],["yield","Getiri"],["date","Tarih"]].map(([k,l]) => (
                <button key={k} onClick={() => setSortBy(k)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid #ddd", cursor: "pointer", background: sortBy === k ? "#111" : "#fff", color: sortBy === k ? "#fff" : "#555" }}>{l}</button>
              ))}
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ borderBottom: "1px solid #eee" }}>
              {["#","İlan","Satış","Kira/ay","Amortisman","Getiri","Tarih","Skor","Öneri"].map(h => (
                <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, color: "#aaa", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.map((p, i) => {
                const ay = p.analysis.amortizationMonths;
                const yil = ay ? (ay/12).toFixed(1) : null;
                const days = p.publishDate ? daysAgo(p.publishDate) : null;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f5f4f0", background: i === 0 ? "#f0fdf4" : "transparent" }}>
                    <td style={{ padding: "8px", fontWeight: 700, color: i === 0 ? "#059669" : "#ccc" }}>{i+1}</td>
                    <td style={{ padding: "8px", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>
                      <a href={p.url} target="_blank" rel="noreferrer" style={{ color: "#111", textDecoration: "none" }}>{(p.title||"").substring(0,26)}</a>
                    </td>
                    <td style={{ padding: "8px", fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtTL(p.salePrice)}</td>
                    <td style={{ padding: "8px", fontFamily: "monospace", whiteSpace: "nowrap", color: p.rentSource === "gercek" ? "#7c3aed" : "#059669" }}>{fmtTL(p.analysis.estimatedMonthlyRent)}</td>
                    <td style={{ padding: "8px", fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap", color: yil < 15 ? "#059669" : yil < 20 ? "#d97706" : "#dc2626" }}>
                      {ay} <span style={{ fontWeight: 400, fontSize: 11 }}>({yil}y)</span>
                    </td>
                    <td style={{ padding: "8px", fontFamily: "monospace" }}>%{p.analysis.grossYield}</td>
                    <td style={{ padding: "8px" }}>{days !== null ? <AgeBadge days={days} /> : "—"}</td>
                    <td style={{ padding: "8px" }}><ScoreBadge score={p.analysis.score} /></td>
                    <td style={{ padding: "8px" }}><RecBadge rec={p.analysis.recommendation} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {properties.length === 0 && steps.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 24px", border: "1.5px dashed #ddd", borderRadius: 14, color: "#aaa" }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>🏢</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, color: "#555" }}>İki sayfa kaynağı yapıştırın</div>
          <div style={{ fontSize: 13, lineHeight: 2, maxWidth: 420, margin: "0 auto", color: "#888" }}>
            <b>Satılık:</b> sahibinden.com/satilik-bina/istanbul<br/>
            <b>Kiralık:</b> sahibinden.com/kiralik-bina/istanbul<br/>
            Her ikisinde de <b>Ctrl+U → Ctrl+A → Ctrl+C</b><br/>
            İlgili kutuya <b>Ctrl+V</b> ile yapıştırın
          </div>
        </div>
      )}

      <div>{sorted.map(p => <PropCard key={p.id} prop={p} onDelete={handleDelete} />)}</div>
    </div>
  );
}
