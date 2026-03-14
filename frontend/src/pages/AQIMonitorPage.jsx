import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { aqiAPI } from '../services/aqiService';
import {
  Wind, Search, MapPin, RefreshCw, AlertCircle, ArrowLeft,
  BarChart2, FlaskConical, Calendar, Activity, Baby, Users,
  Heart, Shield, Leaf, Car, Droplets, Smartphone, X, Zap
} from 'lucide-react';

/* ─── AQI scale ─── */
const AQI_SCALE = [
  { max: 50,  label: 'Good',        color: '#22c55e' },
  { max: 100, label: 'Satisfactory',color: '#84cc16' },
  { max: 200, label: 'Moderate',    color: '#eab308' },
  { max: 300, label: 'Poor',        color: '#f97316' },
  { max: 400, label: 'Very Poor',   color: '#ef4444' },
  { max: 500, label: 'Severe',      color: '#a855f7' },
];
const getAQIMeta = v => AQI_SCALE.find(b => v <= b.max) ?? AQI_SCALE.at(-1);

/* ─── India SVG map ─── */
const INDIA_PATH = `
  M 97,41 L 123,30 L 157,57 L 170,81 L 183,120
  L 217,151 L 277,167 L 290,167 L 310,164
  L 330,170 L 350,162 L 377,151 L 410,151
  L 403,182 L 370,198 L 350,222 L 337,245
  L 337,253 L 323,253 L 303,261 L 283,253
  L 263,284 L 237,308 L 210,331 L 183,355
  L 181,392 L 174,425 L 143,471
  L 137,464 L 130,441 L 117,417
  L 107,396 L 97,366 L 94,355 L 86,323
  L 81,298 L 81,269 L 77,265
  L 57,269 L 50,269 L 31,248
  L 27,237 L 23,229
  L 37,222 L 43,214 L 57,206
  L 50,190 L 50,167 L 50,135
  L 83,112 L 103,104 L 117,88
  L 103,73 L 121,57 Z
`;
const SRILANKA_PATH = `M 178,444 L 187,464 L 197,475 L 202,468 L 193,454 Z`;

function proj(lat, lon) {
  return { x: (lon - 67.5) * 13.33 + 10, y: (37.5 - lat) * 15.67 + 10 };
}

const CITIES = {
  Delhi:      { lat: 28.61, lon: 77.21 },
  Mumbai:     { lat: 19.08, lon: 72.88 },
  Bangalore:  { lat: 12.97, lon: 77.59 },
  Hyderabad:  { lat: 17.38, lon: 78.49 },
  Chennai:    { lat: 13.08, lon: 80.27 },
  Kolkata:    { lat: 22.57, lon: 88.36 },
  Pune:       { lat: 18.52, lon: 73.86 },
  Ahmedabad:  { lat: 23.02, lon: 72.57 },
  Jaipur:     { lat: 26.91, lon: 75.79 },
  Lucknow:    { lat: 26.85, lon: 80.95 },
  Chandigarh: { lat: 30.73, lon: 76.78 },
  Bhopal:     { lat: 23.26, lon: 77.41 },
};

/* ─── animation presets ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] },
});

/* ─── AQI Gauge ─── */
function AQIGauge({ value, color, size = 160 }) {
  const r = size * 0.37, cx = size / 2, cy = size / 2 + 8;
  const pct = Math.min(value / 500, 1);
  const toR = d => (d * Math.PI) / 180;
  const pt = d => ({ x: cx + r * Math.cos(toR(d)), y: cy + r * Math.sin(toR(d)) });
  const s = pt(135), eT = pt(405), eV = pt(135 + 270 * pct), lg = 270 * pct > 180 ? 1 : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={`M${s.x},${s.y} A${r},${r} 0 1 1 ${eT.x},${eT.y}`}
        fill="none" stroke="currentColor" strokeOpacity="0.08"
        strokeWidth="7" strokeLinecap="round" className="text-foreground" />
      {value > 0 && (
        <path d={`M${s.x},${s.y} A${r},${r} 0 ${lg} 1 ${eV.x},${eV.y}`}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)`, transition: 'all 1.1s cubic-bezier(.4,0,.2,1)' }} />
      )}
      <text x={cx} y={cy - 5} textAnchor="middle"
        fontSize={size * 0.25} fontWeight="800" fill={color}>{value}</text>
      <text x={cx} y={cy + 15} textAnchor="middle"
        fontSize={size * 0.068} fill="currentColor" fillOpacity="0.35"
        className="text-foreground" style={{ textTransform: 'uppercase', letterSpacing: 2 }}>AQI</text>
    </svg>
  );
}

/* ─── Section label ─── */
function SectionLabel({ children }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-3">{children}</p>;
}

/* ─── Pollutant bar row ─── */
function PollBar({ name, val, max, desc, color }) {
  const pct = Math.min((parseFloat(val) / max) * 100, 100);
  return (
    <div className="bg-secondary/40 border border-border/50 rounded-2xl p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm font-bold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <span className="text-sm font-black tabular-nums" style={{ color }}>
          {val} <span className="text-[10px] font-normal text-muted-foreground">µg/m³</span>
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Health row ─── */
function HealthRow({ Icon, group, rec }) {
  return (
    <div className="flex gap-3 items-start bg-secondary/40 border border-border/50 rounded-2xl p-4">
      <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{group}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec}</p>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'overview',   label: 'Overview',   Icon: BarChart2    },
  { id: 'pollutants', label: 'Pollutants', Icon: FlaskConical },
  { id: 'forecast',   label: 'Forecast',   Icon: Calendar     },
  { id: 'health',     label: 'Health',     Icon: Activity     },
];

/* ─── Main page ─── */
export default function AQIMonitorPage() {
  const navigate = useNavigate();
  const inputRef  = useRef(null);

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
      p => {
        setMyCoords({ lat: p.coords.latitude, lon: p.coords.longitude });
        loadMyAQI(p.coords.latitude, p.coords.longitude);
      },
      () => setLoading(false)
    );
  }, []);

  const loadMyAQI = async (lat, lon) => {
    try { const r = await aqiAPI.getByCoords(lat, lon); setMyAQI(r.data); loadForecast(lat, lon); }
    catch { } finally { setLoading(false); }
  };
  const loadCities = async () => {
    try { const r = await aqiAPI.getCities(); setCities(r.data.cities || []); } catch { }
  };
  const loadForecast = async (lat, lon) => {
    try { const r = await aqiAPI.getForecast(lat, lon); setForecast(r.data.forecast || []); } catch { }
  };

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
    try { const r = await aqiAPI.getByCity(name); setResult(r.data); setTab('overview'); } catch { }
  };

  const data     = result || myAQI;
  const aqiMeta  = data ? getAQIMeta(data.aqi.value) : null;
  const sorted   = [...cities].sort((a, b) => (b.aqi?.value || 0) - (a.aqi?.value || 0));
  const isDemo   = cities[0]?.isDemo || myAQI?.isDemo;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── sticky top bar ── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
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
            <div className="hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-secondary border border-border font-semibold">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: getAQIMeta(myAQI.aqi.value).color }} />
              {myAQI.city} · <strong>{myAQI.aqi.value}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">

        {/* ── hero header ── */}
        <motion.div {...fadeUp(0)} className="relative bg-card dark:bg-zinc-900 rounded-3xl p-7 sm:p-9 mb-7 overflow-hidden shadow-sm dark:shadow-2xl border border-border dark:border-white/[0.06]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/60 via-primary to-primary/20 dark:hidden" />
          <div className="absolute inset-0 opacity-0 dark:opacity-[0.035] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
          <div className="absolute -top-10 -right-10 w-56 h-56 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-white/35 mb-2">Real-time · India</p>
              <h1 className="text-4xl lg:text-5xl font-black text-foreground dark:text-white tracking-tight leading-none mb-3">
                Air Quality <span className="text-primary">Index</span>
              </h1>
              <p className="text-muted-foreground dark:text-white/45 text-sm font-medium flex items-center gap-2">
                <MapPin size={13} className="text-primary" />
                {data ? `Viewing: ${[data.city, data.state].filter(Boolean).join(', ')}` : 'Search a city or use your location'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    ref={inputRef}
                    className="h-10 w-52 pl-9 pr-8 bg-secondary dark:bg-white/[0.08] border border-border dark:border-white/[0.15] rounded-2xl text-sm font-medium text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-white/30 focus:outline-none focus:border-primary transition-all"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSearchErr(''); }}
                    placeholder="Search city…"
                  />
                  {query && (
                    <button type="button" onClick={() => { setQuery(''); setResult(null); setSearchErr(''); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="submit" disabled={searching || !query.trim()}
                  className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-sm font-bold transition-all disabled:opacity-40 shadow-lg shadow-primary/30">
                  {searching ? <RefreshCw size={14} className="animate-spin" /> : 'Go'}
                </button>
                {myCoords && (
                  <button type="button" onClick={() => { setResult(null); setQuery(''); }}
                    className="h-10 w-10 bg-secondary dark:bg-white/[0.08] border border-border dark:border-white/[0.15] text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white rounded-2xl flex items-center justify-center transition-all">
                    <MapPin size={14} className="text-primary" />
                  </button>
                )}
              </form>
            </div>
          </div>

          {searchErr && (
            <p className="relative z-10 flex items-center gap-1.5 text-xs text-destructive mt-3">
              <AlertCircle size={13} /> {searchErr}
            </p>
          )}

          {isDemo && (
            <div className="relative z-10 mt-4 flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 w-fit">
              <AlertCircle size={12} /> Demo mode — add OpenWeather API key for live data
            </div>
          )}
        </motion.div>

        {/* ── main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_290px] gap-5 items-start">

          {/* ═══ COL 1 — gauge + scale + ranking ═══ */}
          <div className="flex flex-col gap-4">

            {/* gauge card */}
            {data ? (
              <motion.div {...fadeUp(0.06)} className="glass-card rounded-3xl p-5 text-center relative overflow-hidden"
                style={{ '--aqi-color': aqiMeta.color }}>
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl" style={{ background: aqiMeta.color }} />
                <AQIGauge value={data.aqi.value} color={aqiMeta.color} size={150} />
                <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border"
                  style={{ color: aqiMeta.color, borderColor: `${aqiMeta.color}35`, background: `${aqiMeta.color}12` }}>
                  {data.aqi.emoji} {data.aqi.label || aqiMeta.label}
                </span>
                <div className="mt-3">
                  <p className="font-bold text-base text-foreground leading-tight">{data.city}</p>
                  {data.state && <p className="text-xs text-muted-foreground mt-0.5">{data.state}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {new Date(data.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {data.isDemo && <span className="bg-secondary rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">Demo</span>}
                  </p>
                </div>
              </motion.div>
            ) : loading ? (
              <div className="glass-card rounded-3xl p-10 text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <RefreshCw className="w-5 h-5 mx-auto mb-3 text-muted-foreground" />
                </motion.div>
                <p className="text-xs text-muted-foreground">Locating you…</p>
              </div>
            ) : (
              <motion.div {...fadeUp(0.06)} className="glass-card rounded-3xl p-6 text-center">
                <Wind className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-15" strokeWidth={1} />
                <p className="text-sm font-bold mb-1">Search a city</p>
                <p className="text-xs text-muted-foreground mb-4">to see live AQI data</p>
                <div className="flex flex-col gap-1.5">
                  {['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad'].map(c => (
                    <button key={c} onClick={() => { setQuery(c); pickCity(c); }}
                      className="px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs font-bold hover:bg-secondary hover:border-primary/30 hover:text-primary transition-all text-left">
                      {c}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* AQI scale */}
            {data && (
              <motion.div {...fadeUp(0.1)} className="glass-card rounded-3xl p-4">
                <SectionLabel>AQI Scale</SectionLabel>
                <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-3">
                  {AQI_SCALE.map((bp, i) => {
                    const active = data.aqi.value <= bp.max && (i === 0 || data.aqi.value > (AQI_SCALE[i - 1]?.max || 0));
                    return <div key={i} className="flex-1 transition-opacity" style={{ background: bp.color, opacity: active ? 1 : 0.15 }} />;
                  })}
                </div>
                {AQI_SCALE.map(bp => {
                  const active = aqiMeta?.label === bp.label;
                  return (
                    <div key={bp.label} className={`flex items-center gap-2 text-[11px] py-0.5 transition-opacity ${active ? 'opacity-100 font-bold' : 'opacity-35'}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bp.color }} />
                      {bp.label}
                      <span className="ml-auto font-mono text-muted-foreground text-[10px]">{bp.max}</span>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* city ranking */}
            {sorted.length > 0 && (
              <motion.div {...fadeUp(0.14)} className="glass-card rounded-3xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Cities Ranked</SectionLabel>
                  <button onClick={loadCities} className="text-muted-foreground hover:text-primary transition-colors">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {sorted.map((city, i) => {
                    const m = city.aqi ? getAQIMeta(city.aqi.value) : null;
                    const active = selCity === city.name || data?.city === city.name;
                    return (
                      <button key={city.name} onClick={() => pickCity(city.name)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left ${active ? 'bg-primary/10' : 'hover:bg-secondary/60'}`}>
                        <span className="text-[10px] font-black text-muted-foreground w-4 text-center">{i + 1}</span>
                        <span className="flex-1 text-xs font-semibold truncate text-foreground">{city.name}</span>
                        <span className="text-xs font-black tabular-nums" style={{ color: m?.color }}>{city.aqi?.value ?? '—'}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══ COL 2 — tab panels ═══ */}
          <motion.div {...fadeUp(0.08)} className="glass-card rounded-3xl overflow-hidden min-h-[420px]">
            {data ? (
              <>
                {/* tab bar */}
                <div className="flex border-b border-border">
                  {TABS.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap ${
                        tab === id
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="p-5 sm:p-6"
                  >

                    {/* ── overview ── */}
                    {tab === 'overview' && (
                      <div className="space-y-5">
                        {/* advice */}
                        <div className="flex gap-3 bg-secondary/40 border border-border/50 rounded-2xl p-4">
                          <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-lg"
                            style={{ background: `${aqiMeta.color}15` }}>
                            {data.aqi.emoji || '💨'}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{data.aqi.advice}</p>
                        </div>

                        {/* primary pollutants */}
                        <div className="grid grid-cols-2 gap-3">
                          {[['PM2.5', data.components.pm25, '#f97316'], ['PM10', data.components.pm10, '#eab308']].map(([k, v, c]) => (
                            <div key={k} className="bg-secondary/40 border border-border/50 rounded-2xl p-4">
                              <SectionLabel>{k}</SectionLabel>
                              <p className="text-3xl font-black" style={{ color: c }}>{v}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">µg/m³</p>
                            </div>
                          ))}
                        </div>

                        {/* secondary pollutants */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[['NO₂', data.components.no2], ['O₃', data.components.o3], ['SO₂', data.components.so2], ['CO', data.components.co]].map(([k, v]) => (
                            <div key={k} className="bg-secondary/30 border border-border/40 rounded-2xl p-3 text-center">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">{k}</p>
                              <p className="text-base font-black text-foreground tabular-nums">{v}</p>
                              <p className="text-[9px] text-muted-foreground">µg/m³</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── pollutants ── */}
                    {tab === 'pollutants' && (
                      <div className="space-y-3">
                        <PollBar name="PM2.5" val={data.components.pm25} max={250} desc="Fine inhalable particles" color="#f97316" />
                        <PollBar name="PM10"  val={data.components.pm10} max={430} desc="Coarse particles"        color="#eab308" />
                        <PollBar name="NO₂"   val={data.components.no2}  max={200} desc="Nitrogen dioxide"       color="#a855f7" />
                        <PollBar name="O₃"    val={data.components.o3}   max={180} desc="Ground-level ozone"     color="#3b82f6" />
                        <PollBar name="CO"    val={data.components.co}   max={10000} desc="Carbon monoxide"      color="#ef4444" />
                        <PollBar name="SO₂"   val={data.components.so2}  max={350} desc="Sulfur dioxide"         color="#22c55e" />
                      </div>
                    )}

                    {/* ── forecast ── */}
                    {tab === 'forecast' && (
                      forecast.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          {forecast.map((day, i) => {
                            const m = getAQIMeta(day.aqi.value);
                            return (
                              <div key={i} className="bg-secondary/40 border border-border/50 rounded-2xl p-3.5 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: m.color }} />
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">{day.date}</p>
                                <p className="text-2xl font-black tabular-nums" style={{ color: m.color }}>{day.aqi.value}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 font-semibold">{m.label}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-16 text-center text-muted-foreground">
                          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-15" strokeWidth={1} />
                          <p className="text-sm font-medium">Forecast unavailable</p>
                          <p className="text-xs mt-1">Select a city to load forecast</p>
                        </div>
                      )
                    )}

                    {/* ── health ── */}
                    {tab === 'health' && (
                      <div className="space-y-3">
                        <HealthRow Icon={Baby}     group="Children"
                          rec={data.aqi.value > 200 ? 'Keep indoors. No outdoor play.' : data.aqi.value > 100 ? 'Limit outdoor time to 30 mins.' : 'Safe for normal outdoor play.'} />
                        <HealthRow Icon={Users}    group="Elderly"
                          rec={data.aqi.value > 150 ? 'Stay indoors. Use air purifier.' : data.aqi.value > 100 ? 'Wear N95 if going out.' : 'Safe. Take usual precautions.'} />
                        <HealthRow Icon={Activity} group="Active Adults"
                          rec={data.aqi.value > 200 ? 'No outdoor exercise.' : data.aqi.value > 100 ? 'Move exercise indoors.' : 'Good conditions for outdoor exercise.'} />
                        <HealthRow Icon={Wind}     group="Respiratory"
                          rec={data.aqi.value > 100 ? 'Avoid going out. Take prescribed meds.' : "Low risk. Follow doctor's advice."} />
                        <HealthRow Icon={Heart}    group="Pregnant Women"
                          rec={data.aqi.value > 150 ? 'Stay indoors. Consult doctor.' : data.aqi.value > 100 ? 'Minimize outdoor time.' : 'Moderate caution advised.'} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                <BarChart2 className="w-12 h-12 mb-4 opacity-10" strokeWidth={1} />
                <p className="text-sm font-bold">Select a city</p>
                <p className="text-xs mt-1">to view air quality details</p>
              </div>
            )}
          </motion.div>

          {/* ═══ COL 3 — map + tips ═══ */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-20">

            {/* India map */}
            <motion.div {...fadeUp(0.12)} className="glass-card rounded-3xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <SectionLabel>India Map</SectionLabel>
                <span className="text-[10px] text-muted-foreground font-semibold">tap to select</span>
              </div>
              <div className="p-3 bg-secondary/20">
                <svg viewBox="0 0 430 490" className="w-full h-auto">
                  <path d={INDIA_PATH} fill="currentColor" fillOpacity="0.06"
                    stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25"
                    strokeLinejoin="round" strokeLinecap="round" className="text-foreground" />
                  <path d={SRILANKA_PATH} fill="currentColor" fillOpacity="0.06"
                    stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" className="text-foreground" />
                  {[[343,402],[344,412],[345,422]].map(([x,y],i) => (
                    <circle key={i} cx={x} cy={y} r={3} fill="currentColor" fillOpacity="0.08"
                      stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8" className="text-foreground" />
                  ))}
                  {Object.entries(CITIES).map(([name, { lat, lon }]) => {
                    const { x, y } = proj(lat, lon);
                    const cd = cities.find(c => c.name === name);
                    const m = cd ? getAQIMeta(cd.aqi?.value || 0) : null;
                    const col = m?.color ?? 'currentColor';
                    const isActive = selCity === name || data?.city === name;
                    const isHov = hovCity === name;
                    const anchor = x > 210 ? 'end' : 'start';
                    const lx = x > 210 ? x - 8 : x + 8;
                    return (
                      <g key={name} onClick={() => pickCity(name)}
                        onMouseEnter={() => setHovCity(name)} onMouseLeave={() => setHovCity(null)}
                        style={{ cursor: 'pointer' }}>
                        {isActive && <circle cx={x} cy={y} r={14} fill={col} opacity={0.12} />}
                        {isHov && !isActive && <circle cx={x} cy={y} r={9} fill={col} opacity={0.1} />}
                        <circle cx={x} cy={y} r={isActive ? 7 : isHov ? 5.5 : 4}
                          fill={col} stroke="var(--background)" strokeWidth="1.5"
                          style={{ transition: 'r .15s', filter: isActive ? `drop-shadow(0 0 4px ${col})` : 'none' }} />
                        <text x={lx} y={y + 4} textAnchor={anchor}
                          fontSize="8.5" fontWeight={isActive ? '700' : '500'}
                          fill="currentColor" fillOpacity={isActive || isHov ? 0.85 : 0.4}
                          className="text-foreground pointer-events-none">{name}</text>
                        {isHov && cd?.aqi?.value && (
                          <g>
                            <rect x={x - 17} y={y - 28} width={34} height={18} rx={5} fill={col} />
                            <text x={x} y={y - 14} textAnchor="middle" fontSize="9" fontWeight="800" fill="white">
                              {cd.aqi.value}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="px-4 pb-3 pt-1 flex flex-wrap gap-x-3 gap-y-1.5">
                {AQI_SCALE.map(bp => (
                  <div key={bp.label} className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bp.color }} />
                    {bp.label}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* protection tips */}
            <motion.div {...fadeUp(0.16)} className="glass-card rounded-3xl p-5">
              <SectionLabel><Shield className="inline w-3 h-3 mr-1" />Protection Tips</SectionLabel>
              <div className="space-y-0.5">
                {[
                  { Icon: Shield,     tip: 'Wear N95 masks when AQI > 150' },
                  { Icon: Leaf,       tip: 'Indoor plants filter air naturally' },
                  { Icon: Car,        tip: 'Avoid exercising near heavy traffic' },
                  { Icon: Wind,       tip: 'Use air purifier indoors when AQI > 200' },
                  { Icon: Droplets,   tip: 'Wet mop to reduce indoor dust' },
                  { Icon: Smartphone, tip: 'Check AQI before outdoor activities' },
                ].map(({ Icon, tip }) => (
                  <div key={tip} className="flex items-center gap-2.5 py-2 text-xs text-muted-foreground border-b last:border-0 border-border/40">
                    <Icon className="w-3.5 h-3.5 shrink-0 text-primary opacity-70" />
                    {tip}
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