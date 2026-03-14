import { callAPI } from '../services/api';
import { Phone, Bot, Radio, CheckCircle2, Building2, Lock, Loader, Check, X } from 'lucide-react';

export default function CallPermissionModal({ complaint, onClose, onCallStarted }) {
    const [step, setStep] = useState('permission'); // permission → script → calling → done
    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState('');
    const [callData, setCallData] = useState(null);
    const [callLogId, setCallLogId] = useState(null);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    async function handlePermissionGrant() {
        setLoading(true);
        try {
            const res = await callAPI.requestPermission(complaint._id);
            setScript(res.data.script);
            setCallLogId(res.data.callLogId);
            setStep('script');
        } catch (e) {
            setError('Failed to generate call script: ' + e.message);
        }
        setLoading(false);
    }

    async function handleConfirmCall() {
        setLoading(true);
        try {
            const res = await callAPI.confirmCall({ callLogId, officerPhone: phone || undefined });
            setCallData(res.data);
            setStep('calling');
            onCallStarted?.(res.data);
            // Start polling for updates
            setTimeout(() => setStep('done'), 5000);
        } catch (e) {
            setError('Call failed: ' + e.message);
        }
        setLoading(false);
    }

    const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
    const modalStyle = { background: 'white', borderRadius: '24px', maxWidth: '520px', width: '100%', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.25)', animation: 'slideUp .3s ease' };

    return (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#FF9933,#E8720C)', padding: '1.5rem', color: 'white' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'Rajdhani,sans-serif' }}>
                        {step === 'permission' && <div className="flex items-center gap-2"><Phone size={20} /> AI Officer Call</div>}
                        {step === 'script' && <div className="flex items-center gap-2"><Bot size={20} /> Call Script Preview</div>}
                        {step === 'calling' && <div className="flex items-center gap-2 animate-pulse"><Radio size={20} /> Call In Progress...</div>}
                        {step === 'done' && <div className="flex items-center gap-2"><CheckCircle2 size={20} /> Call Initiated</div>}
                    </div>
                    <div style={{ fontSize: '.85rem', opacity: .9, marginTop: '.25rem' }}>
                        {complaint.title} — {complaint.department || complaint.category}
                    </div>
                </div>

                <div style={{ padding: '1.5rem' }}>

                    {/* STEP 1 — Permission */}
                    {step === 'permission' && (
                        <>
                            <div style={{ background: '#FFF3E0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(255,153,51,.25)' }}>
                                <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '.5rem', color: '#E8720C', display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} /> JantaVoice AI will:</div>
                                {['Call the responsible department officer', 'Explain your complaint professionally', 'Ask for resolution timeline', 'Record the full conversation', 'Generate a transcript for your records'].map(item => (
                                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', color: '#555', marginBottom: '.3rem' }}>
                                        <span style={{ color: '#138808', fontWeight: '800' }}><Check size={14} /></span>{item}
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(19,136,8,.2)', fontSize: '.82rem', color: '#555', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <Lock size={16} className="text-india-green shrink-0 mt-0.5" />
                                <div><strong>Privacy:</strong> The call will be made from JantaVoice's number. Your personal phone number will NOT be shared with the department.</div>
                            </div>

                            {error && <div style={{ color: '#DC2626', fontSize: '.85rem', marginBottom: '1rem', background: '#FEE2E2', padding: '.75rem', borderRadius: '10px' }}>{error}</div>}

                            <div style={{ display: 'flex', gap: '.75rem' }}>
                                <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '2px solid #E5E7EB', borderRadius: '12px', background: 'white', cursor: 'pointer', fontWeight: '700', color: '#555', fontFamily: 'Nunito,sans-serif' }}>
                                    Not Now
                                </button>
                                <button onClick={handlePermissionGrant} disabled={loading} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#FF9933,#E8720C)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontFamily: 'Nunito,sans-serif', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {loading ? <Loader size={18} className="animate-spin" /> : <Phone size={18} />}
                                    {loading ? 'Generating Script...' : 'Yes, Call Department'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* STEP 2 — Script Preview */}
                    {step === 'script' && (
                        <>
                            <div style={{ marginBottom: '1rem', fontSize: '.9rem', color: '#555', fontWeight: '600' }}>
                                Review the AI script before the call is placed:
                            </div>
                            <div style={{ background: '#F9FAF7', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid #E5E7EB', maxHeight: '200px', overflowY: 'auto' }}>
                                <pre style={{ fontSize: '.82rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#1A1A1A', fontFamily: 'Nunito,sans-serif', margin: 0 }}>{script}</pre>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '.82rem', fontWeight: '700', color: '#555', marginBottom: '.4rem' }}>
                                    Officer Phone (optional — leave blank to use test number)
                                </label>
                                <input value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder="+91 XXXXX XXXXX"
                                    style={{ width: '100%', border: '2px solid #E5E7EB', borderRadius: '10px', padding: '9px 14px', fontSize: '.9rem', fontFamily: 'Nunito,sans-serif', outline: 'none', background: 'transparent', color: '#1A1A1A', boxSizing: 'border-box' }} />
                                <div style={{ fontSize: '.72rem', color: '#999', marginTop: '.3rem' }}>
                                    ⚠️ Without Twilio setup, this runs in demo mode and calls your test number.
                                </div>
                            </div>

                            {error && <div style={{ color: '#DC2626', fontSize: '.85rem', marginBottom: '1rem', background: '#FEE2E2', padding: '.75rem', borderRadius: '10px' }}>{error}</div>}

                            <div style={{ display: 'flex', gap: '.75rem' }}>
                                <button onClick={() => setStep('permission')} style={{ flex: 1, padding: '11px', border: '2px solid #E5E7EB', borderRadius: '12px', background: 'transparent', color: '#555', cursor: 'pointer', fontWeight: '700', fontFamily: 'Nunito,sans-serif' }}>
                                    ← Back
                                </button>
                                <button onClick={handleConfirmCall} disabled={loading} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#138808,#0A5C04)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontFamily: 'Nunito,sans-serif', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {loading ? <Radio size={18} className="animate-pulse" /> : <Phone size={18} />}
                                    {loading ? 'Placing Call...' : 'Place Call Now'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* STEP 3 — Calling animation */}
                    {step === 'calling' && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                            <div className="flex justify-center mb-4 text-primary animate-pulse shadow-sm">
                                <Radio size={64} />
                            </div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '.5rem', color: '#1A1A1A' }}>Call In Progress</div>
                            <div style={{ color: '#666', fontSize: '.85rem', marginBottom: '1.5rem' }}>AI agent is speaking with the department officer...</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                {[0, .2, .4, .6, .8].map(d => (
                                    <div key={d} style={{ width: '4px', borderRadius: '3px', background: '#FF9933', animation: `waveBar 1s ease infinite ${d}s`, height: '24px' }} />
                                ))}
                            </div>
                            <div style={{ marginTop: '1.5rem', fontSize: '.8rem', color: '#999' }}>
                                Call SID: {callData?.callSid}<br />
                                You will be notified when the call completes and transcript is ready.
                            </div>
                        </div>
                    )}

                    {/* STEP 4 — Done */}
                    {step === 'done' && (
                        <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                            <div className="flex justify-center mb-4 text-success drop-shadow-md">
                                <CheckCircle2 size={64} />
                            </div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '.5rem', color: '#1A1A1A' }}>Call Initiated Successfully</div>
                            <div style={{ color: '#666', fontSize: '.85rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                                The AI agent is calling the department.<br />
                                You'll receive a notification when the transcript is ready.
                            </div>
                             <button onClick={onClose} style={{ padding: '15px 40px', background: 'linear-gradient(135deg,#FF9933,#E8720C)', color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer', fontWeight: '800', fontFamily: 'Nunito,sans-serif', fontSize: '1rem' }}>
                                Got it
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
