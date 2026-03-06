import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRobot, FaTimes, FaWindowMinimize, FaPaperPlane } from 'react-icons/fa';

export default function ChatBot({ openReport }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'नमस्ते! 🙏 I am JantaBot — your civic assistant. I can help you file complaints, track status, or generate government letters. What can I help you with today?',
            timestamp: new Date()
        },
        {
            role: 'bot',
            text: 'Quick options:',
            quickReplies: ['📢 File a complaint', '🔍 Track my complaint', '🏛️ Check gov portal', '📄 Generate letter'],
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [unread, setUnread] = useState(0);

    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setUnread(0);
        }
    }, [messages, isOpen, isTyping]);

    const handleActionClick = (action) => {
        if (action.type === 'open_report') {
            if (openReport) openReport();
            else navigate('/report');
        } else if (action.type === 'open_tracker') {
            navigate('/gov-tracking');
        } else if (action.type === 'open_letter') {
            navigate('/my-complaints?tab=letters');
        } else if (action.type === 'open_gov') {
            navigate('/gov-tracking');
        }
        setIsOpen(false);
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const newUserMessage = { role: 'user', text, timestamp: new Date() };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsTyping(true);

        const newHistory = [...conversationHistory, { role: 'user', content: text }];

        try {
            const res = await fetch('https://jantavoice0-2.onrender.com/api/chatbot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, conversationHistory: newHistory })
            });
            const data = await res.json();

            setIsTyping(false);
            if (data.success) {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: data.reply,
                    timestamp: new Date(),
                    action: data.action
                }]);
                setConversationHistory([...newHistory, { role: 'assistant', content: data.reply }]);
                if (!isOpen) setUnread(prev => prev + 1);
            } else {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: 'Sorry, I am having trouble connecting. Please try again! 🙏',
                    timestamp: new Date()
                }]);
                if (!isOpen) setUnread(prev => prev + 1);
            }
        } catch (err) {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'Sorry, I am having trouble connecting. Please try again! 🙏',
                timestamp: new Date()
            }]);
            if (!isOpen) setUnread(prev => prev + 1);
        }
    };

    return (
        <>
            {/* FLOATING BUTTON */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-8 right-8 z-[900] w-14 h-14 rounded-full bg-gradient-to-r from-saffron to-orange-500 text-white shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 focus:outline-none ${!isOpen ? 'animate-pulse' : ''}`}
            >
                <FaRobot />
                {unread > 0 && !isOpen && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
                        {unread}
                    </span>
                )}
            </button>

            {/* CHAT WINDOW */}
            {isOpen && (
                <div className="fixed bottom-24 right-8 z-[900] w-[360px] h-[520px] bg-white rounded-[20px] shadow-[0_12px_48px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-slide-up border border-gray-100">

                    {/* HEADER */}
                    <div className="bg-gradient-to-r from-saffron to-orange-500 p-4 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                                <FaRobot />
                            </div>
                            <div>
                                <h3 className="font-bold text-[15px] leading-tight flex items-center gap-2">
                                    JantaBot
                                    <span className="flex items-center gap-1 text-[10px] font-normal bg-white/20 px-1.5 py-0.5 rounded-full">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        Online
                                    </span>
                                </h3>
                                <p className="text-[11px] text-white/80">Janta Voice AI Assistant</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white">
                                <FaWindowMinimize className="text-sm" />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    {/* MESSAGES AREA */}
                    <div className="flex-1 p-4 overflow-y-auto bg-[#FAFAFA] flex flex-col gap-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3 text-[14px] leading-relaxed relative ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-saffron to-orange-500 text-white rounded-2xl rounded-tr-sm shadow-md'
                                    : 'bg-white text-gray-700 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <span className={`text-[9px] mt-1 block w-full ${msg.role === 'user' ? 'text-white/70 text-right' : 'text-gray-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* Quick Replies */}
                                {msg.quickReplies && (
                                    <div className="flex flex-wrap gap-2 mt-2 max-w-[90%]">
                                        {msg.quickReplies.map((qr, qidx) => (
                                            <button
                                                key={qidx}
                                                onClick={() => sendMessage(qr)}
                                                className="bg-saffron/10 text-saffron text-xs px-3 py-1.5 rounded-full font-bold hover:bg-saffron hover:text-white transition-colors border border-saffron/20 shadow-sm"
                                            >
                                                {qr}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Intent Action Button */}
                                {msg.action && (
                                    <button
                                        onClick={() => handleActionClick(msg.action)}
                                        className="mt-2 bg-india-green text-white text-xs px-4 py-2 rounded-full font-bold hover:bg-india-green-dark transition-all shadow-md transform hover:-translate-y-0.5 w-max"
                                    >
                                        {msg.action.label}
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex items-start">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex gap-1.5 items-center">
                                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* INPUT ROW */}
                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                            placeholder="Type your message..."
                            disabled={isTyping}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron"
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={isTyping || !input.trim()}
                            className="bg-saffron text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:bg-saffron-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FaPaperPlane className="text-sm -ml-0.5" />
                        </button>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </>
    );
}
