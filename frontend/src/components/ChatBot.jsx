import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatbotAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Search, Building2, ClipboardList, Info, Bot, Send, X } from 'lucide-react';

const QUICK_REPLIES = [
    { label: 'File a complaint', icon: <Megaphone size={12} /> },
    { label: 'Track my complaint', icon: <Search size={12} /> },
    { label: 'Gov portal help', icon: <Building2 size={12} /> },
    { label: 'Generate letter', icon: <ClipboardList size={12} /> },
    { label: 'How it works', icon: <Info size={12} /> }
];
const INITIAL_MSG = { role: 'bot', text: 'नमस्ते! I am JantaBot. I can help you file complaints, track status, or generate government letters. आप हिंदी में भी बात कर सकते हैं!', showQuickReplies: true };

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
            setMsgs(p => [...p, { role: 'bot', text: 'Sorry, having trouble connecting. Please try again later.' }]);
        }
    }

    function handleAction(action) {
        if (!action) return;
        if (action.type === 'open_report') { onOpenReport?.(); setOpen(false); }
        else if (action.type === 'open_tracker') navigate('/gov-tracking');
        else if (action.type === 'open_letters') navigate('/letters');
        else if (action.type === 'open_gov') navigate('/gov-tracking');
    }

    return (
        <>
            <button className="fixed z-[900] bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full bg-primary text-white shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border-none cursor-pointer" onClick={() => { setOpen(p => !p); setUnread(0); }}>
                {open ? <X size={24} /> : <Bot size={24} />}
                {!open && unread > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-[18px] h-[18px] text-[10px] font-bold flex items-center justify-center">{unread}</span>}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed z-[901] bottom-40 md:bottom-28 right-4 md:right-8 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[70vh] bg-background/90 backdrop-blur-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border"
                    >
                        {/* Header */}
                        <div className="p-4 bg-secondary/50 border-b border-border flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center"><Bot size={20} /></div>
                            <div className="flex-1">
                                <div className="font-semibold text-base text-foreground">JantaBot</div>
                                <div className="text-xs text-muted-foreground">Online — JantaVoice AI</div>
                            </div>
                            <button onClick={() => setOpen(false)} className="bg-secondary text-foreground w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/80 transition-colors"><X size={14} /></button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                            {msgs.map((m, i) => (
                                <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}>
                                        {m.text}
                                    </div>
                                    {m.showQuickReplies && (
                                        <div className="flex flex-wrap gap-2 mt-1 -mb-1">
                                            {QUICK_REPLIES.map(qr => (
                                                <button key={qr.label} onClick={() => send(qr.label)} className="bg-transparent text-primary border border-primary/30 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-primary/5 transition-colors flex items-center gap-1.5">
                                                    {qr.icon} {qr.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {m.action && (
                                        <button onClick={() => handleAction(m.action)} className="mt-1 bg-secondary text-foreground border border-border rounded-xl px-4 py-1.5 text-xs font-semibold hover:bg-secondary/80 transition-colors">
                                            {m.action.label}
                                        </button>
                                    )}
                                </div>
                            ))}
                            {typing && (
                                <div className="flex items-center gap-1 bg-secondary text-foreground rounded-2xl p-3 px-4 w-fit rounded-bl-sm">
                                    {[0, .2, .4].map(d => <span key={d} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-border bg-transparent flex gap-2">
                            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
                                placeholder="Message..."
                                className="flex-1 border border-border rounded-full px-4 py-2.5 text-sm bg-background text-foreground outline-none focus:border-primary transition-colors" />
                            <button onClick={() => send(input)} className="w-[42px] h-[42px] shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"><Send size={18} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
