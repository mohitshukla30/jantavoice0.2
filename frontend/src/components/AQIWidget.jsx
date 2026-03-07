import { useState, useEffect } from 'react';
import { aqiAPI } from '../services/api';

export default function AQIWidget({ onReportPollution }) {
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
            <div onClick={() => setExpanded(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', border: `2px solid ${color}`, borderRadius: '50px', padding: '9px 18px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,.10)', transition: 'all .2s', userSelect: 'none' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'statusPulse 2s infinite', flexShrink: 0 }} />
                <span style={{ fontWeight: '800', fontSize: '.95rem', color }}>{loading ? '...' : data?.aqi?.value}</span>
                <span style={{ fontSize: '.8rem', fontWeight: '700', color: '#555' }}>{loading ? 'AQI' : data?.aqi?.label}</span>
                <span style={{ fontSize: '.75rem', color: '#999', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.city || ''}</span>
                <span style={{ color: '#ccc', fontSize: '.8rem' }}>{expanded ? '▼' : '▲'}</span>
            </div>

            {/* Expanded popup */}
            {expanded && data && (
                <div style={{ position: 'absolute', bottom: '54px', left: 0, width: '300px', background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(16px)', borderRadius: '20px', boxShadow: '0 12px 48px rgba(0,0,0,.15)', border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden', animation: 'slideUp .25s ease' }}>
                    {/* Header */}
                    <div style={{ padding: '1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '.95rem' }}>{data.city} Air Quality</div>
                            <div style={{ fontSize: '.7rem', color: '#999' }}>Updated just now</div>
                        </div>
                        <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }}>✕</button>
                    </div>

                    {/* Gauge */}
                    <div style={{ padding: '1rem', textAlign: 'center' }}>
                        <svg width="160" height="110" viewBox="0 0 140 100">
                            <path d="M 18 92 A 52 52 0 1 1 122 92" fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round" />
                            <path d="M 18 92 A 52 52 0 1 1 122 92" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={circ * 0.75} strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
                            <text x="70" y="78" textAnchor="middle" fontSize="26" fontWeight="800" fill={color}>{data.aqi.value}</text>
                            <text x="70" y="94" textAnchor="middle" fontSize="12" fill="#555">{data.aqi.emoji} {data.aqi.label}</text>
                        </svg>
                    </div>

                    {/* Advice */}
                    <div style={{ margin: '0 1rem', padding: '.75rem', borderRadius: '10px', background: color + '18', border: `1px solid ${color}30`, fontSize: '.8rem', color: '#333', lineHeight: '1.5', marginBottom: '.75rem' }}>
                        {data.aqi.advice}
                    </div>

                    {/* Pollutants grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', padding: '0 1rem 1rem' }}>
                        {[['PM2.5', data.components.pm25, 'µg/m³'], ['PM10', data.components.pm10, 'µg/m³'], ['NO2', data.components.no2, 'µg/m³'], ['O3', data.components.o3, 'µg/m³']].map(([k, v, u]) => (
                            <div key={k} style={{ background: '#F9FAF7', borderRadius: '8px', padding: '.5rem .75rem' }}>
                                <div style={{ fontSize: '.68rem', color: '#999', fontWeight: '700' }}>{k}</div>
                                <div style={{ fontSize: '.9rem', fontWeight: '800', color: '#1A1A1A' }}>{v} <span style={{ fontSize: '.65rem', color: '#aaa' }}>{u}</span></div>
                            </div>
                        ))}
                    </div>

                    {/* Report button if AQI is poor */}
                    {data.aqi.value > 150 && (
                        <div style={{ padding: '0 1rem 1rem' }}>
                            <button onClick={() => { onReportPollution?.(data); setExpanded(false); }}
                                style={{ width: '100%', background: 'linear-gradient(135deg,#FF9933,#E8720C)', color: 'white', border: 'none', borderRadius: '10px', padding: '9px', fontWeight: '800', fontSize: '.85rem', cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
                                📢 Report Air Pollution Issue
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
