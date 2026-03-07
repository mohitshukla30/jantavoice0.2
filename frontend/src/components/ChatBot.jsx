import { useState, useRef, useEffect } from 'react';
import { chatbotAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const QUICK_REPLIES = ['📢 File a complaint', '🔍 Track my complaint', '🏛️ Gov portal help', '📄 Generate letter', '❓ How does this work'];
const INITIAL_MSG = { role: 'bot', text: 'नमस्ते! 🙏 I am JantaBot. I can help you file complaints, track status, or generate government letters. आप हिंदी में भी बात कर सकते हैं!', showQuickReplies: true };

export default function ChatBot({ onOpenReport }) {
    const [open, setOpen] = useState(false);
    const [msgs, setMsgs] = useState([INITIAL_MSG]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [history, setHistory] = useState([]);
    const [unread, setUnread] = useState(0);
    const bottomRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

    async function send(text) {
        if (!text?.trim()) return;
        const userMsg = { role: 'user', text };
        setMsgs(p => [...p, userMsg]);
        setInput(''); setTyping(true);
        const newHistory = [...history, { role: 'user', content: text }];
        try {
            const res = await chatbotAPI.chat({ message: text, history: newHistory });
            const data = res.data;
            setTyping(false);
            const botMsg = { role: 'bot', text: data.reply, action: data.action };
            setMsgs(p => [...p, botMsg]);
            setHistory([...newHistory, { role: 'assistant', content: data.reply }]);
            if (!open) setUnread(p => p + 1);
        } catch {
            setTyping(false);
            setMsgs(p => [...p, { role: 'bot', text: 'Sorry, having trouble connecting. Please try again 🙏' }]);
        }
    }

    function handleAction(action) {
        if (!action) return;
        if (action.type === 'open_report') { onOpenReport?.(); setOpen(false); }
        else if (action.type === 'open_tracker') navigate('/gov-tracking');
        else if (action.type === 'open_letters') navigate('/letters');
        else if (action.type === 'open_gov') navigate('/gov-tracking');
    }

    const fabStyle = { position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 900, width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#FF9933,#E8720C)', border: 'none', cursor: 'pointer', fontSize: '24px', boxShadow: '0 4px 20px rgba(255,153,51,.4)', transition: 'all .3s', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'floatY 4s ease infinite' };

    return (
        <>
            <button style={fabStyle} onClick={() => { setOpen(p => !p); setUnread(0); }}>
                {open ? '✕' : '🤖'}
                {!open && unread > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
            </button>

            {open && (
                <div style={{ position: 'fixed', bottom: '5.5rem', right: '2rem', zIndex: 901, width: '360px', height: '520px', background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(20px)', borderRadius: '24px', boxShadow: '0 16px 60px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,153,51,.15)', animation: 'slideUp .3s ease' }}>
                    {/* Header */}
                    <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg,#FF9933,#E8720C)', color: 'white', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🤖</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '800', fontSize: '1rem', fontFamily: 'Rajdhani,sans-serif' }}>JantaBot</div>
                            <div style={{ fontSize: '.72rem', opacity: .85 }}>● Online — JantaVoice AI</div>
                        </div>
                        <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                        {msgs.map((m, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '.3rem' }}>
                                <div style={{ maxWidth: '78%', padding: '.65rem .9rem', borderRadius: '16px', fontSize: '.84rem', lineHeight: '1.5', background: m.role === 'user' ? 'linear-gradient(135deg,#FF9933,#E8720C)' : '#F3F4F6', color: m.role === 'user' ? 'white' : '#1A1A1A', borderBottomRightRadius: m.role === 'user' ? '4px' : '16px', borderBottomLeftRadius: m.role === 'bot' ? '4px' : '16px' }}>
                                    {m.text}
                                </div>
                                {m.showQuickReplies && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.25rem' }}>
                                        {QUICK_REPLIES.map(qr => (
                                            <button key={qr} onClick={() => send(qr)} style={{ background: '#FFF3E0', color: '#E8720C', border: '1px solid rgba(255,153,51,.3)', borderRadius: '16px', padding: '3px 10px', fontSize: '.72rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'Nunito,sans-serif' }}>
                                                {qr}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {m.action && (
                                    <button onClick={() => handleAction(m.action)} style={{ background: '#E8F5E9', color: '#0A5C04', border: '1px solid rgba(19,136,8,.25)', borderRadius: '10px', padding: '5px 14px', fontSize: '.78rem', fontWeight: '700', cursor: 'pointer', marginTop: '.2rem', fontFamily: 'Nunito,sans-serif' }}>
                                        {m.action.label}
                                    </button>
                                )}
                            </div>
                        ))}
                        {typing && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#F3F4F6', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '10px 14px', width: 'fit-content' }}>
                                {[0, .2, .4].map(d => <span key={d} style={{ width: '7px', height: '7px', background: '#9CA3AF', borderRadius: '50%', display: 'inline-block', animation: `blink .9s ease infinite ${d}s` }} />)}
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: '.75rem', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '.5rem' }}>
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
                            placeholder="Type your message..."
                            style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '8px 12px', fontSize: '.85rem', fontFamily: 'Nunito,sans-serif', outline: 'none' }} />
                        <button onClick={() => send(input)} style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg,#FF9933,#E8720C)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: 'white', fontSize: '16px' }}>→</button>
                    </div>
                </div>
            )}
        </>
    );
}
