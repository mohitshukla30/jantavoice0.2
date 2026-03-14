import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { aqiAPI } from '../services/aqiService';
import {
  Wind, Search, MapPin, RefreshCw, AlertCircle, ArrowLeft,
  BarChart2, FlaskConical, Calendar, Activity, Baby, Users,
  Heart, Shield, Leaf, Car, Droplets, Smartphone, X, ChevronRight
} from 'lucide-react';

/* ─── AQI scale ─── */
const AQI_SCALE = [
  { max: 50,  label: 'Good',         color: '#22c55e' },
  { max: 100, label: 'Satisfactory', color: '#84cc16' },
  { max: 200, label: 'Moderate',     color: '#eab308' },
  { max: 300, label: 'Poor',         color: '#f97316' },
  { max: 400, label: 'Very Poor',    color: '#ef4444' },
  { max: 500, label: 'Severe',       color: '#a855f7' },
];
const getAQIMeta = v => AQI_SCALE.find(b => v <= b.max) ?? AQI_SCALE.at(-1);

/* ─── India map paths ─── */
const INDIA_PATH = `M 97,41 L 123,30 L 157,57 L 170,81 L 183,120 L 217,151 L 277,167 L 290,167 L 310,164 L 330,170 L 350,162 L 377,151 L 410,151 L 403,182 L 370,198 L 350,222 L 337,245 L 337,253 L 323,253 L 303,261 L 283,253 L 263,284 L 237,308 L 210,331 L 183,355 L 181,392 L 174,425 L 143,471 L 137,464 L 130,441 L 117,417 L 107,396 L 97,366 L 94,355 L 86,323 L 81,298 L 81,269 L 77,265 L 57,269 L 50,269 L 31,248 L 27,237 L 23,229 L 37,222 L 43,214 L 57,206 L 50,190 L 50,167 L 50,135 L 83,112 L 103,104 L 117,88 L 103,73 L 121,57 Z`;
const SRILANKA_PATH = `M 178,444 L 187,464 L 197,475 L 202,468 L 193,454 Z`;

function proj(lat, lon) {
  return { x: (lon - 67.5) * 13.33 + 10, y: (37.5 - lat) * 15.67 + 10 };
}

const CITIES = {
  Delhi:      { lat: 28.61, lon: 77.21 }, Mumbai:     { lat: 19.08, lon: 72.88 },
  Bangalore:  { lat: 12.97, lon: 77.59 }, Hyderabad:  { lat: 17.38, lon: 78.49 },
  Chennai:    { lat: 13.08, lon: 80.27 }, Kolkata:    { lat: 22.57, lon: 88.36 },
  Pune:       { lat: 18.52, lon: 73.86 }, Ahmedabad:  { lat: 23.02, lon: 72.57 },
  Jaipur:     { lat: 26.91, lon: 75.79 }, Lucknow:    { lat: 26.85, lon: 80.95 },
  Chandigarh: { lat: 30.73, lon: 76.78 }, Bhopal:     { lat: 23.26, lon: 77.41 },
};

/* ─── animation helpers ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── sub-components ─── */

function SectionLabel({ children, className = '' }) {
  return (
    <p className={`text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground ${className}`}>
      {children}
    </p>
  );
}

function AQIGauge({ value, color, size = 152 }) {
  const r  = size * 0.36, cx = size / 2, cy = size / 2 + 10;
  const pct = Math.min(value / 500, 1);
  const toR = d => (d * Math.PI) / 180;
  const pt  = d => ({ x: cx + r * Math.cos(toR(d)), y: cy + r * Math.sin(toR(d)) });
  const s   = pt(135), eT = pt(405), eV = pt(135 + 270 * pct);
  const lg  = 270 * pct > 180 ? 1 : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={`M${s.x},${s.y} A${r},${r} 0 1 1 ${eT.x},${eT.y}`}
        fill="none" stroke="currentColor" strokeOpacity="0.07"
        strokeWidth="6" strokeLinecap="round" className="text-foreground" />
      {value > 0 && (
        <path d={`M${s.x},${s.y} A${r},${r} 0 ${lg} 1 ${eV.x},${eV.y}`}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}55)`, transition: 'all 1.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle"
        fontSize={size * 0.235} fontWeight="800" fill={color} style={{ letterSpacing: '-1px' }}>{value}</text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        fontSize={size * 0.065} fill="currentColor" fillOpacity="0.28"
        className="text-foreground" style={{ textTransform: 'uppercase', letterSpacing: '3px' }}>AQI</text>
    </svg>
  );
}

function PollBar({ name, val, max, desc, color }) {
  const pct = Math.min((parseFloat(val) / max) * 100, 100);
  return (
    <div className="bg-secondary/40 border border-border/50 rounded-2xl p-4 hover:border-border transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm font-bold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-black tabular-nums" style={{ color }}>{val}</span>
          <span className="text-[10px] text-muted-foreground ml-1">µg/m³</span>
        </div>
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: `linear-gradient(90deg, ${color}70, ${color})` }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-muted-foreground font-semibold">0</span>
        <span className="text-[9px] text-muted-foreground font-semibold">{pct.toFixed(0)}% of safe limit</span>
        <span className="text-[9px] text-muted-foreground font-semibold">{max}</span>
      </div>
    </div>
  );
}

function HealthRow({ Icon, group, rec, level }) {
  const cfg = {
    safe:    'text-green-600 bg-green-500/10 border-green-500/20',
    caution: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
    risk:    'text-red-600 bg-red-500/10 border-red-500/20',
  }[level] || 'text-muted-foreground bg-secondary border-border';
  return (
    <div className="flex gap-3 items-start bg-secondary/40 border border-border/50 rounded-2xl p-4 hover:border-border transition-all">
      <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-bold text-foreground">{group}</p>
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg}`}>
            {level}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
      </div>
    </div>
  );
}

function getHealthLevel(value, [lo, hi]) {
  return value <= lo ? 'safe' : value <= hi ? 'caution' : 'risk';
}

const TABS = [
  { id: 'overview',   label: 'Overview',   Icon: BarChart2    },
  { id: 'pollutants', label: 'Pollutants', Icon: FlaskConical },
  { id: 'forecast',   label: 'Forecast',   Icon: Calendar     },
  { id: 'health',     label: 'Health',     Icon: Activity     },
];

/* ─── page ─── */
export default function AQIMonitorPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [myAQI,     setMyAQI]     = useState(null);
  const [cities,    setCities]    = useState([]);
  const [forecast,  setForecast]  = useState([]);
  const [query,     setQuery]     = useState('');
  const [result,    setResult]    = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [selCity,   setSelCity]   = useState(null);
  const [hovCity,   setHovCity]   = useState(null);
  const [myCoords,  setMyCoords]  = useState(null);
  const [tab,       setTab]       = useState('overview');

  useEffect(() => {
    loadCities();
    navigator.geolocation?.getCurrentPosition(
      p => { setMyCoords({ lat: p.coords.latitude, lon: p.coords.longitude }); loadMyAQI(p.coords.latitude, p.coords.longitude); },
      () => setLoading(false)
    );
  }, []);

  const loadMyAQI   = async (lat, lon) => { try { const r = await aqiAPI.getByCoords(lat, lon); setMyAQI(r.data); loadForecast(lat, lon); } catch {} finally { setLoading(false); } };
  const loadCities  = async ()         => { try { const r = await aqiAPI.getCities(); setCities(r.data.cities || []); } catch {} };
  const loadForecast= async (lat, lon) => { try { const r = await aqiAPI.getForecast(lat, lon); setForecast(r.data.forecast || []); } catch {} };

  const handleSearch = async e => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setSearchErr(''); setResult(null);
    try {
      const r = await aqiAPI.getByCity(query.trim());
      setResult(r.data);
      loadForecast(r.data.coordinates?.lat, r.data.coordinates?.lon);
      setTab('overview');
    } catch (e) { setSearchErr(e.response?.data?.message || 'City not found.'); }
    setSearching(false);
  };

  const pickCity = async name => {
    setSelCity(name); setQuery(name);
    try { const r = await aqiAPI.getByCity(name); setResult(r.data); setTab('overview'); } catch {}
  };

  const data   = result || myAQI;
  const meta   = data ? getAQIMeta(data.aqi.value) : null;
  const sorted = [...cities].sort((a, b) => (b.aqi?.value || 0) - (a.aqi?.value || 0));
  const isDemo = cities[0]?.isDemo || myAQI?.isDemo;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── nav ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Wind className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight">Air Quality Monitor</span>
            <span className="hidden sm:block text-muted-foreground text-xs">— India</span>
          </div>
          {myAQI && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-secondary border border-border font-bold">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: getAQIMeta(myAQI.aqi.value).color }} />
              <span className="hidden sm:inline text-muted-foreground">{myAQI.city} ·</span>
              <span style={{ color: getAQIMeta(myAQI.aqi.value).color }}>{myAQI.aqi.value}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">

        {/* ── hero header ── */}
        <motion.div {...fadeUp(0)}
          className="relative bg-card dark:bg-zinc-900 rounded-3xl p-7 sm:p-9 mb-7 overflow-hidden border border-border dark:border-white/[0.06] shadow-sm dark:shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/60 via-primary to-primary/20 dark:hidden" />
          <div className="absolute inset-0 opacity-0 dark:opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/8 dark:bg-primary/18 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/35 mb-2">Real-time · India</p>
              <h1 className="text-4xl lg:text-5xl font-black text-foreground dark:text-white tracking-tight leading-none mb-3">
                Air Quality <span className="text-primary">Index</span>
              </h1>
              <p className="text-muted-foreground dark:text-white/40 text-sm font-medium flex items-center gap-2">
                <MapPin size={13} className="text-primary shrink-0" />
                {data ? `Viewing: ${[data.city, data.state].filter(Boolean).join(', ')}` : 'Search a city or allow location access'}
              </p>
            </div>

            {/* search form */}
            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input ref={inputRef}
                  className="w-full sm:w-52 h-10 pl-9 pr-8 bg-secondary dark:bg-white/[0.08] border border-border dark:border-white/[0.15] rounded-2xl text-sm font-medium text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-white/30 focus:outline-none focus:border-primary transition-all"
                  value={query} onChange={e => { setQuery(e.target.value); setSearchErr(''); }}
                  placeholder="Search city…" />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setResult(null); setSearchErr(''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                )}
              </div>
              <button type="submit" disabled={searching || !query.trim()}
                className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-sm font-bold transition-all disabled:opacity-40 shadow-lg shadow-primary/25 shrink-0">
                {searching
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw size={14} /></motion.div>
                  : 'Search'}
              </button>
              {myCoords && (
                <button type="button" onClick={() => { setResult(null); setQuery(''); setSelCity(null); }} title="My location"
                  className="h-10 w-10 bg-secondary dark:bg-white/[0.08] border border-border dark:border-white/[0.15] text-muted-foreground dark:text-white/60 hover:text-primary rounded-2xl flex items-center justify-center transition-all shrink-0">
                  <MapPin size={14} />
                </button>
              )}
            </form>
          </div>

          {searchErr && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex items-center gap-1.5 text-xs text-destructive mt-3 font-medium">
              <AlertCircle size={12} /> {searchErr}
            </motion.p>
          )}
          {isDemo && (
            <div className="relative z-10 mt-5 inline-flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={12} /> Demo mode — add OpenWeather API key for live data
            </div>
          )}
        </motion.div>

        {/* ── 3-col grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_280px] gap-5 items-start">

          {/* COL 1 */}
          <div className="flex flex-col gap-4">

            {/* gauge */}
            <AnimatePresence mode="wait">
              {data ? (
                <motion.div key="gauge"
                  initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="glass-card rounded-3xl p-5 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl transition-all duration-700" style={{ background: meta.color }} />
                  <div className="absolute inset-0 rounded-3xl pointer-events-none opacity-[0.025]"
                    style={{ background: `radial-gradient(circle at 50% 30%, ${meta.color}, transparent 65%)` }} />
                  <AQIGauge value={data.aqi.value} color={meta.color} size={148} />
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border mt-1 mb-3"
                    style={{ color: meta.color, borderColor: `${meta.color}28`, background: `${meta.color}10` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </div>
                  <p className="font-bold text-base text-foreground leading-tight">{data.city}</p>
                  {data.state && <p className="text-xs text-muted-foreground mt-0.5">{data.state}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Updated {new Date(data.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {data.isDemo && <span className="bg-secondary rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ml-1">Demo</span>}
                  </p>
                </motion.div>
              ) : loading ? (
                <motion.div key="loading" {...fadeUp(0)} className="glass-card rounded-3xl p-10 text-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 mx-auto mb-3">
                    <RefreshCw className="w-6 h-6 text-muted-foreground" />
                  </motion.div>
                  <p className="text-xs text-muted-foreground font-medium">Detecting location…</p>
                </motion.div>
              ) : (
                <motion.div key="empty" {...fadeUp(0)} className="glass-card rounded-3xl p-6">
                  <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
                    <Wind className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-bold text-center mb-0.5">Select a city</p>
                  <p className="text-xs text-muted-foreground text-center mb-4">to see live AQI</p>
                  <div className="flex flex-col gap-1.5">
                    {['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad'].map(c => (
                      <button key={c} onClick={() => pickCity(c)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs font-bold hover:bg-secondary hover:border-primary/30 hover:text-primary transition-all group">
                        {c}
                        <ChevronRight size={12} className="text-muted-foreground group-hover:text-primary" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* scale */}
            {data && (
              <motion.div {...fadeUp(0.1)} className="glass-card rounded-3xl p-4">
                <SectionLabel className="mb-3">AQI Scale</SectionLabel>
                <div className="flex h-1.5 rounded-full overflow-hidden mb-3 gap-px">
                  {AQI_SCALE.map((bp, i) => {
                    const active = data.aqi.value <= bp.max && (i === 0 || data.aqi.value > (AQI_SCALE[i-1]?.max || 0));
                    return <div key={i} className="flex-1 transition-opacity duration-500" style={{ background: bp.color, opacity: active ? 1 : 0.13 }} />;
                  })}
                </div>
                {AQI_SCALE.map(bp => {
                  const active = meta?.label === bp.label;
                  return (
                    <div key={bp.label} className={`flex items-center gap-2 py-[3px] text-[11px] transition-all ${active ? 'opacity-100 font-bold' : 'opacity-25'}`}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bp.color }} />
                      <span className="flex-1">{bp.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{bp.max}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ranking */}
            {sorted.length > 0 && (
              <motion.div {...fadeUp(0.14)} className="glass-card rounded-3xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel className="mb-0">Cities Ranked</SectionLabel>
                  <button onClick={loadCities} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-lg hover:bg-secondary">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {sorted.map((city, i) => {
                    const m      = city.aqi ? getAQIMeta(city.aqi.value) : null;
                    const active = selCity === city.name || data?.city === city.name;
                    return (
                      <button key={city.name} onClick={() => pickCity(city.name)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left ${active ? 'bg-primary/10' : 'hover:bg-secondary/70'}`}>
                        <span className="text-[10px] font-black text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>
                        <span className="flex-1 text-xs font-semibold truncate text-foreground">{city.name}</span>
                        <span className="text-xs font-black tabular-nums shrink-0" style={{ color: m?.color }}>{city.aqi?.value ?? '—'}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* COL 2 — tabs */}
          <motion.div {...fadeUp(0.08)} className="glass-card rounded-3xl overflow-hidden min-h-[440px] flex flex-col">
            {data ? (
              <>
                <div className="flex border-b border-border shrink-0">
                  {TABS.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                        tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                      }`}>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={tab}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="p-5 sm:p-6 flex-1">

                    {tab === 'overview' && (
                      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
                        <motion.div variants={staggerItem} className="flex gap-3 bg-secondary/40 border border-border/50 rounded-2xl p-4">
                          <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border border-border bg-background">
                            <Wind className="w-4 h-4" style={{ color: meta.color }} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Advisory</p>
                            <p className="text-sm text-foreground leading-relaxed font-medium">{data.aqi.advice}</p>
                          </div>
                        </motion.div>

                        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
                          {[{ k: 'PM2.5', v: data.components.pm25, c: '#f97316', note: 'Fine particles' },
                            { k: 'PM10',  v: data.components.pm10, c: '#eab308', note: 'Coarse particles' }].map(({ k, v, c, note }) => (
                            <div key={k} className="bg-secondary/40 border border-border/50 rounded-2xl p-4 relative overflow-hidden">
                              <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-full opacity-[0.07]"
                                style={{ background: c, filter: 'blur(16px)' }} />
                              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">{k}</p>
                              <p className="text-3xl font-black" style={{ color: c }}>{v}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{note} · µg/m³</p>
                            </div>
                          ))}
                        </motion.div>

                        <motion.div variants={staggerItem} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {[['NO₂', data.components.no2], ['O₃', data.components.o3], ['SO₂', data.components.so2], ['CO', data.components.co]].map(([k, v]) => (
                            <div key={k} className="bg-secondary/30 border border-border/40 rounded-2xl p-3 text-center">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">{k}</p>
                              <p className="text-base font-black text-foreground tabular-nums">{v}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">µg/m³</p>
                            </div>
                          ))}
                        </motion.div>

                        <motion.div variants={staggerItem}
                          className="flex items-center justify-between bg-secondary/40 border border-border/50 rounded-2xl px-4 py-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">Risk Level</p>
                            <p className="text-sm font-bold" style={{ color: meta.color }}>{data.aqi.risk || meta.label}</p>
                          </div>
                          <div className="flex gap-1.5">
                            {AQI_SCALE.map((bp, i) => {
                              const active = meta?.label === bp.label;
                              return (
                                <div key={i} className="w-5 h-5 rounded-lg transition-all duration-300"
                                  style={{ background: bp.color, opacity: active ? 1 : 0.13, transform: active ? 'scale(1.2)' : 'scale(1)' }} />
                              );
                            })}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {tab === 'pollutants' && (
                      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                        {[
                          { name: 'PM2.5', val: data.components.pm25, max: 250,   desc: 'Fine inhalable particles < 2.5µm',    color: '#f97316' },
                          { name: 'PM10',  val: data.components.pm10, max: 430,   desc: 'Coarse particles < 10µm',             color: '#eab308' },
                          { name: 'NO₂',   val: data.components.no2,  max: 200,   desc: 'Nitrogen dioxide — traffic emissions', color: '#a855f7' },
                          { name: 'O₃',    val: data.components.o3,   max: 180,   desc: 'Ground-level ozone',                  color: '#3b82f6' },
                          { name: 'CO',    val: data.components.co,   max: 10000, desc: 'Carbon monoxide',                     color: '#ef4444' },
                          { name: 'SO₂',   val: data.components.so2,  max: 350,   desc: 'Sulfur dioxide — industrial sources', color: '#22c55e' },
                        ].map((p, i) => (
                          <motion.div key={p.name} variants={staggerItem}><PollBar {...p} /></motion.div>
                        ))}
                      </motion.div>
                    )}

                    {tab === 'forecast' && (
                      forecast.length > 0 ? (
                        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          {forecast.map((day, i) => {
                            const m = getAQIMeta(day.aqi.value);
                            return (
                              <motion.div key={i} variants={staggerItem}
                                className={`border rounded-2xl p-3.5 text-center relative overflow-hidden transition-all ${
                                  i === 0 ? 'bg-primary/5 border-primary/25' : 'bg-secondary/40 border-border/50'
                                }`}>
                                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: m.color }} />
                                {i === 0 && <span className="text-[8px] font-black uppercase tracking-wider text-primary block mb-1">Today</span>}
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">{day.date}</p>
                                <p className="text-2xl font-black tabular-nums" style={{ color: m.color }}>{day.aqi.value}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 font-semibold">{m.label}</p>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
                            <Calendar className="w-5 h-5 opacity-30" strokeWidth={1.5} />
                          </div>
                          <p className="text-sm font-bold text-foreground">No forecast data</p>
                          <p className="text-xs mt-1">Select a city to load forecast</p>
                        </div>
                      )
                    )}

                    {tab === 'health' && (
                      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                        {[
                          { Icon: Baby,     group: 'Children',              thresholds: [100, 200],
                            rec: data.aqi.value > 200 ? 'Keep indoors. Cancel all outdoor activities.' : data.aqi.value > 100 ? 'Limit outdoor play to under 30 minutes.' : 'Safe for normal outdoor activities.' },
                          { Icon: Users,    group: 'Elderly',               thresholds: [100, 150],
                            rec: data.aqi.value > 150 ? 'Stay indoors. Use air purifier if available.' : data.aqi.value > 100 ? 'Wear N95 mask when going outside.' : 'Safe. Take standard precautions.' },
                          { Icon: Activity, group: 'Active Adults',         thresholds: [150, 200],
                            rec: data.aqi.value > 200 ? 'No outdoor exercise. Move all activities indoors.' : data.aqi.value > 150 ? 'Reduce intensity of outdoor activities.' : 'Good conditions for outdoor exercise.' },
                          { Icon: Wind,     group: 'Respiratory Conditions',thresholds: [50, 100],
                            rec: data.aqi.value > 100 ? 'Avoid outdoors. Keep rescue medication on hand.' : data.aqi.value > 50 ? 'Be cautious. Follow medication schedule.' : 'Low risk. Follow your doctor\'s advice.' },
                          { Icon: Heart,    group: 'Pregnant Women',        thresholds: [100, 150],
                            rec: data.aqi.value > 150 ? 'Stay indoors. Consult your doctor if symptomatic.' : data.aqi.value > 100 ? 'Minimize time outdoors, especially at peak hours.' : 'Moderate caution advised.' },
                        ].map(({ Icon, group, rec, thresholds }, i) => (
                          <motion.div key={group} variants={staggerItem}>
                            <HealthRow Icon={Icon} group={group} rec={rec} level={getHealthLevel(data.aqi.value, thresholds)} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
                  <BarChart2 className="w-6 h-6 opacity-20" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-foreground">No data selected</p>
                <p className="text-xs mt-1">Search a city or click a map marker</p>
              </div>
            )}
          </motion.div>

          {/* COL 3 — map + tips */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-20">

            <motion.div {...fadeUp(0.12)} className="glass-card rounded-3xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <SectionLabel className="mb-0">India Map</SectionLabel>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wide">Click to select</span>
              </div>
              <div className="p-3 bg-secondary/10">
                <svg viewBox="0 0 430 490" className="w-full h-auto">
                  <path d={INDIA_PATH} fill="currentColor" fillOpacity="0.04"
                    stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.18"
                    strokeLinejoin="round" strokeLinecap="round" className="text-foreground" />
                  <path d={SRILANKA_PATH} fill="currentColor" fillOpacity="0.04"
                    stroke="currentColor" strokeWidth="1" strokeOpacity="0.14" className="text-foreground" />
                  {[[343,402],[344,412],[345,422]].map(([x,y],i) => (
                    <circle key={i} cx={x} cy={y} r={2.5} fill="currentColor" fillOpacity="0.07"
                      stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.7" className="text-foreground" />
                  ))}
                  {Object.entries(CITIES).map(([name, { lat, lon }]) => {
                    const { x, y } = proj(lat, lon);
                    const cd       = cities.find(c => c.name === name);
                    const m        = cd ? getAQIMeta(cd.aqi?.value || 0) : null;
                    const col      = m?.color ?? '#888';
                    const isActive = selCity === name || data?.city === name;
                    const isHov    = hovCity === name;
                    const anchor   = x > 210 ? 'end' : 'start';
                    const lx       = x > 210 ? x - 9 : x + 9;
                    return (
                      <g key={name} onClick={() => pickCity(name)}
                        onMouseEnter={() => setHovCity(name)} onMouseLeave={() => setHovCity(null)}
                        style={{ cursor: 'pointer' }}>
                        {isActive && <circle cx={x} cy={y} r={13} fill={col} opacity={0.1} />}
                        {isHov && !isActive && <circle cx={x} cy={y} r={9} fill={col} opacity={0.08} />}
                        <circle cx={x} cy={y} r={isActive ? 6.5 : isHov ? 5.5 : 4}
                          fill={col} stroke="var(--background)" strokeWidth="1.5"
                          style={{ transition: 'r 0.2s', filter: isActive ? `drop-shadow(0 0 5px ${col}80)` : 'none' }} />
                        <text x={lx} y={y + 4} textAnchor={anchor} fontSize="8.5"
                          fontWeight={isActive ? '700' : '400'} fill="currentColor"
                          fillOpacity={isActive ? 0.88 : isHov ? 0.65 : 0.35}
                          className="text-foreground pointer-events-none" style={{ letterSpacing: '0.02em' }}>
                          {name}
                        </text>
                        {isHov && cd?.aqi?.value && (
                          <g>
                            <rect x={x - 18} y={y - 30} width={36} height={18} rx={5} fill={col} opacity={0.95} />
                            <text x={x} y={y - 17} textAnchor="middle" fontSize="9" fontWeight="800" fill="white"
                              style={{ letterSpacing: '-0.5px' }}>{cd.aqi.value}</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="px-4 pb-4 pt-1.5 flex flex-wrap gap-x-3 gap-y-1.5">
                {AQI_SCALE.map(bp => (
                  <div key={bp.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bp.color }} />
                    {bp.label}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.16)} className="glass-card rounded-3xl p-5">
              <SectionLabel className="mb-3">Protection Tips</SectionLabel>
              <div className="space-y-0">
                {[
                  { Icon: Shield,     tip: 'N95 masks recommended when AQI exceeds 150'  },
                  { Icon: Leaf,       tip: 'Indoor plants can help filter air naturally'   },
                  { Icon: Car,        tip: 'Avoid exercising near high-traffic roads'      },
                  { Icon: Wind,       tip: 'Air purifier recommended when AQI exceeds 200' },
                  { Icon: Droplets,   tip: 'Wet mopping reduces indoor dust particles'    },
                  { Icon: Smartphone, tip: 'Check local AQI before outdoor activity'      },
                ].map(({ Icon, tip }, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2.5 text-xs text-muted-foreground border-b last:border-0 border-border/40">
                    <Icon className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5 opacity-60" />
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}