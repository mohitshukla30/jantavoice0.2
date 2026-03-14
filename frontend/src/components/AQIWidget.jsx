import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aqiAPI } from '../services/api';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

export default function AQIWidget({ onReportPollution }) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        navigator.geolocation?.getCurrentPosition(
            pos => fetchAQI(pos.coords.latitude, pos.coords.longitude),
            () => { setErr('location denied'); setLoading(false); }
        );
    }, []);

    async function fetchAQI(lat, lon) {
        try {
            const res = await aqiAPI.get(lat, lon);
            setData(res.data);
        } catch { setErr('unavailable'); }
        finally { setLoading(false); }
    }

    if (err || (!loading && !data)) return null;

    const color = data?.aqi?.color || '#FF9933';
    const r = 52, circ = 2 * Math.PI * r;
    const pct = data ? Math.min(data.aqi.value / 500, 1) : 0;
    const dashOffset = circ * (1 - pct * 0.75);

    return (
        <div style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 800 }}>
            {/* Collapsed pill */}
            <div onClick={() => setExpanded(p => !p)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '50px', padding: '8px 16px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.08)', transition: 'transform .2s', userSelect: 'none' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontWeight: '600', fontSize: '.9rem', color: 'var(--foreground)' }}>{loading ? '...' : data?.aqi?.value}</span>
                <span style={{ fontSize: '.8rem', fontWeight: '500', color: 'var(--muted-foreground)' }}>{loading ? 'AQI' : data?.aqi?.label}</span>
                <span style={{ fontSize: '.75rem', color: 'var(--muted-foreground)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.city || ''}</span>
                <span style={{ color: 'var(--muted-foreground)', display: 'flex' }}>{expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</span>
            </div>

            {/* Expanded popup */}
            {expanded && data && (
                <div className="glass" style={{ position: 'absolute', bottom: '54px', left: 0, width: '300px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,.12)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '1.25rem 1.25rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--foreground)' }}>{data.city} Air Quality</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--muted-foreground)' }}>Updated recently</div>
                        </div>
                        <button onClick={() => setExpanded(false)} style={{ background: 'var(--secondary)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}><X size={14} /></button>
                    </div>

                    {/* Gauge */}
                    <div style={{ padding: '0 1rem 1rem', textAlign: 'center' }}>
                        <svg width="160" height="110" viewBox="0 0 140 100">
                            <path d="M 18 92 A 52 52 0 1 1 122 92" fill="none" stroke="var(--secondary)" strokeWidth="10" strokeLinecap="round" />
                            <path d="M 18 92 A 52 52 0 1 1 122 92" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={circ * 0.75} strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
                            <text x="70" y="78" textAnchor="middle" fontSize="28" fontWeight="600" fill="var(--foreground)">{data.aqi.value}</text>
                            <text x="70" y="94" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">{data.aqi.label}</text>
                        </svg>
                    </div>

                    {/* Advice */}
                    <div style={{ margin: '0 1rem', padding: '.75rem 1rem', borderRadius: '12px', background: 'var(--secondary)', fontSize: '.8rem', color: 'var(--foreground)', lineHeight: '1.5', marginBottom: '1rem' }}>
                        {data.aqi.advice}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', padding: '0 1rem 1.25rem' }}>
                        {[['PM2.5', data.components.pm25, 'µg/m³'], ['PM10', data.components.pm10, 'µg/m³'], ['NO2', data.components.no2, 'µg/m³'], ['O3', data.components.o3, 'µg/m³']].map(([k, v, u]) => (
                            <div key={k} style={{ background: 'var(--background)', borderRadius: '12px', padding: '.5rem .75rem', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '.7rem', color: 'var(--muted-foreground)', fontWeight: '500' }}>{k}</div>
                                <div style={{ fontSize: '.9rem', fontWeight: '600', color: 'var(--foreground)' }}>{v} <span style={{ fontSize: '.65rem', color: 'var(--muted-foreground)' }}>{u}</span></div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '0 1rem 1rem' }}>
                        <button
                            onClick={() => { setExpanded(false); navigate('/aqi-monitor'); }}
                            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', color: 'var(--foreground)', fontWeight: '500', fontSize: '.85rem', cursor: 'pointer' }}>
                            View Full Monitor
                        </button>
                    </div>

                    {/* Report button if AQI is poor */}
                    {data.aqi.value > 150 && (
                        <div style={{ padding: '0 1rem 1rem' }}>
                            <button onClick={() => { onReportPollution?.(data); setExpanded(false); }}
                                style={{ width: '100%', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px', fontWeight: '500', fontSize: '.85rem', cursor: 'pointer' }}>
                                Report Air Pollution Issue
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
