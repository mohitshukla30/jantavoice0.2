import { useState, useEffect } from 'react';
import { callAPI } from '../services/api';
import { Phone, Bot, MessageSquare, FileText, Download, Circle } from 'lucide-react';

export default function CallTranscriptViewer({ callLogId, onClose }) {
    const [log, setLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(true);

    useEffect(() => {
        fetchLog();
        const iv = setInterval(() => {
            if (polling) fetchLog();
        }, 10000); // poll every 10 sec for transcript
        return () => clearInterval(iv);
    }, [callLogId, polling]);

    async function fetchLog() {
        try {
            const res = await callAPI.getLog(callLogId);
            setLog(res.data.callLog);
            if (['Transcribed', 'Completed', 'Failed', 'No Answer'].includes(res.data.callLog.status)) {
                setPolling(false);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    const STATUS_COLORS = { 'Script Generated': '#9CA3AF', 'Awaiting Permission': '#F59E0B', 'Calling': '#3B82F6', 'Ringing': '#8B5CF6', 'In Progress': '#FF9933', 'Completed': '#138808', 'Transcribed': '#138808', 'No Answer': '#EF4444', 'Failed': '#EF4444' };

         <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--primary)', className: 'animate-pulse' }}><Phone size={48} /></div>
            <div style={{ marginTop: '1rem', color: '#666', fontWeight: '600' }}>Loading call details...</div>
        </div>

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Status header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: '#F9FAF7', borderRadius: '14px', padding: '1rem 1.25rem' }}>
                <div className="p-3 bg-white rounded-xl shadow-sm text-primary"><Phone size={24} /></div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: '#1A1A1A' }}>{log?.targetDepartment}</div>
                    <div style={{ fontSize: '.8rem', color: '#999' }}>
                        {log?.calledAt ? new Date(log.calledAt).toLocaleString('en-IN') : 'Not yet called'}
                        {log?.duration ? ` · ${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : ''}
                    </div>
                </div>
                <span style={{ background: STATUS_COLORS[log?.status] + '22', color: STATUS_COLORS[log?.status], border: `1px solid ${STATUS_COLORS[log?.status]}44`, padding: '4px 12px', borderRadius: '20px', fontSize: '.75rem', fontWeight: '800' }}>
                    {log?.status}
                </span>
            </div>

            {/* AI Summary */}
            {log?.summary && (
                <div style={{ background: '#E8F5E9', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(19,136,8,.2)' }}>
                    <div style={{ fontWeight: '800', marginBottom: '.5rem', color: '#138808', display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} /> AI Call Summary</div>
                    <div style={{ fontSize: '.85rem', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-line' }}>{log.summary}</div>
                </div>
            )}

            {/* Conversation log */}
            {log?.conversationLog?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: '800', marginBottom: '.75rem', fontSize: '.9rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={16} /> Conversation
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                        {log.conversationLog.map((entry, i) => (
                            <div key={i} style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: '64px', fontSize: '.7rem', fontWeight: '800', color: entry.speaker === 'AI' ? '#FF9933' : '#138808', flexShrink: 0, paddingTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {entry.speaker === 'AI' ? <Bot size={10} /> : <Circle size={10} fill="currentColor" />} {entry.speaker === 'AI' ? 'AI' : 'OFFICER'}
                                </div>
                                <div style={{ flex: 1, background: entry.speaker === 'AI' ? '#FFF3E0' : '#F0FDF4', borderRadius: '10px', padding: '.6rem .9rem', fontSize: '.82rem', lineHeight: '1.5', color: '#333' }}>
                                    {entry.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Full transcript */}
            {log?.transcript && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: '800', marginBottom: '.75rem', fontSize: '.9rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} /> Full Transcript
                    </div>
                    <div style={{ background: '#F9FAF7', borderRadius: '12px', padding: '1rem', border: '1px solid #E5E7EB', maxHeight: '250px', overflowY: 'auto' }}>
                        <pre style={{ fontSize: '.78rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#444', fontFamily: 'Nunito,sans-serif', margin: 0 }}>{log.transcript}</pre>
                    </div>
                    <button
                        onClick={() => { const b = new Blob([log.transcript], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `transcript-${callLogId}.txt`; a.click(); }}
                        style={{ marginTop: '.75rem', padding: '10px 24px', border: '2px solid #FF9933', color: '#FF9933', background: 'transparent', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '.82rem', fontFamily: 'Nunito,sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={16} /> Download Transcript
                    </button>
                </div>
            )}

            {/* Recording */}
            {log?.recordingUrl && (
                <div>
                    <div style={{ fontWeight: '800', marginBottom: '.75rem', fontSize: '.9rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Radio size={16} className="text-destructive" /> Call Recording
                    </div>
                    <audio controls src={log.recordingUrl} style={{ width: '100%', borderRadius: '10px' }} />
                </div>
            )}

            {/* Polling status */}
            {polling && !log?.transcript && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#999', fontSize: '.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Circle size={8} fill="currentColor" className="animate-pulse" /> Waiting for transcript... auto-refreshing every 10 seconds
                </div>
            )}
        </div>
    );
}
