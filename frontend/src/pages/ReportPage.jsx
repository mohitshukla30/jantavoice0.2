import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, Mic, FileText, MapPin, Image, X, Plus, Send, AlertCircle, Info, AlertTriangle, ShieldAlert, Bot, Building2, Zap, Square, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { STATES } from '../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Safety', 'Noise', 'Other'];
const PRIORITIES = [
  { val: 'Low', icon: <Info size={16} />, color: 'border-green-500/20 bg-green-500/10 text-green-600' },
  { val: 'Medium', icon: <AlertCircle size={16} />, color: 'border-blue-500/20 bg-blue-500/10 text-blue-600' },
  { val: 'High', icon: <AlertTriangle size={16} />, color: 'border-orange-500/20 bg-orange-500/10 text-orange-600' },
  { val: 'Critical', icon: <ShieldAlert size={16} />, color: 'border-red-500/20 bg-red-500/10 text-red-600' },
];

export default function ReportPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('quick'); // 'quick', 'voice', 'detailed'

  // Loading States
  const [loading, setLoading] = useState(false);

  // --- Quick File State ---
  const [quickText, setQuickText] = useState('');
  const [quickResult, setQuickResult] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState('');

  // --- Voice State ---
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const recIntervalRef = useRef(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // --- Detailed State ---
  const [step, setStep] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
    address: '', city: '', state: '', pincode: '', isAnonymous: false, autoSubmit: true
  });

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login', { state: { from: { pathname: '/report' } } }); }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  // --- Quick File Handlers ---
  const handleQuickFile = async () => {
    if (!quickText.trim() || quickText.length < 10) {
      toast.error('Please enter at least 10 characters describing the issue.');
      return;
    }
    setLoading(true);
    const msgs = ["🤖 AI is analyzing your complaint...", "🔍 Detecting category...", "⚡ Setting priority...", "💾 Submitting to database..."];
    let mIdx = 0;
    setLoadingMsg(msgs[0]);
    const msgInterval = setInterval(() => {
      mIdx = (mIdx + 1) % msgs.length;
      setLoadingMsg(msgs[mIdx]);
    }, 1500);

    try {
      const locationMatch = quickText.match(/(?:in|near|at|from)\s+([A-Za-z\s]+)/i);
      const extractedCity = locationMatch ? locationMatch[1].trim() : '';

      const { data } = await complaintAPI.quickFile({
        text: quickText,
        location: { city: extractedCity },
        autoSubmit: true
      });

      clearInterval(msgInterval);
      setQuickResult(data.complaint);
      toast.success('✅ AI Filed Your Complaint!');

      setTimeout(() => {
        navigate(`/complaint/${data.complaint._id}`);
      }, 3000);

    } catch (err) {
      clearInterval(msgInterval);
      toast.error(err.response?.data?.message || 'Failed to file. Please try detailed form.');
      setLoading(false);
    }
  };

  // --- Voice Handlers ---
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startVoice = () => {
    if (!speechSupported) {
      toast.error("Browser doesn't support speech recognition.");
      return;
    }
    setTranscript('');
    setInterimTranscript('');
    setVoiceResult(null);
    setRecSeconds(0);
    setRecording(true);

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = 'hi-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let finalStr = '';
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalStr += event.results[i][0].transcript;
        else interimStr += event.results[i][0].transcript;
      }
      if (finalStr) setTranscript(prev => prev + ' ' + finalStr);
      setInterimTranscript(interimStr);

      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        stopVoice();
      }, 5000);
    };

    recognition.onerror = (e) => {
      console.error(e);
      if (e.error !== 'no-speech') {
        toast.error('Microphone error.');
        stopVoice();
      }
    };

    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();

    recIntervalRef.current = setInterval(() => {
      setRecSeconds(s => s + 1);
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      stopVoice();
    }, 5000);
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecording(false);
    clearTimeout(silenceTimerRef.current);
    clearInterval(recIntervalRef.current);
  };

  const processVoiceTranscript = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const { data } = await complaintAPI.extractDetails({ text: transcript });
      setVoiceResult(data.result);
      toast.success('🤖 AI categorized your message!');
    } catch {
      toast.error('Failed to categorize. Try manual submission.');
    } finally {
      setLoading(false);
    }
  };

  const submitVoiceComplaint = async () => {
    setLoading(true);
    try {
      const { data } = await complaintAPI.quickFile({
        text: transcript,
        location: { city: voiceResult?.city, state: voiceResult?.state },
        autoSubmit: true
      });
      toast.success('✅ Complaint filed successfully!');
      navigate(`/complaint/${data.complaint._id}`);
    } catch (err) {
      toast.error('Failed to file complaint.');
    } finally {
      setLoading(false);
    }
  };

  // --- Detailed Form Handlers ---
  const handleAI = async () => {
    if (!form.title || !form.description) { toast.error('Enter title and description first'); return; }
    setAiLoading(true);
    try {
      const { data } = await complaintAPI.aiCategorize({ title: form.title, description: form.description });
      if (data.success && data.result) {
        setForm(f => ({ ...f, category: data.result.category || f.category, priority: data.result.priority || f.priority }));
        toast.success('🤖 AI suggested category & priority!');
      } else toast('AI unavailable, please select manually', { icon: <Info size={16} /> });
    } catch { toast('AI categorization unavailable', { icon: <Info size={16} /> }); }
    finally { setAiLoading(false); }
  };

  const handleImages = (e) => {
    const validFiles = Array.from(e.target.files).filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < e.target.files.length) toast.error('Files over 5MB skipped.');
    const filesToAdd = validFiles.slice(0, 3 - images.length);
    setImages(prev => [...prev, ...filesToAdd].slice(0, 3));
    filesToAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target.result].slice(0, 3));
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx) => {
    setImages(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const fetchLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        toast.success(`Found location: ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        // Setup mock reverse geocode logic if Google Maps isn't active
        setForm(f => ({ ...f, city: 'Local City', state: 'Delhi' }));
      }, () => toast.error('Location rejected.'));
    }
  };

  const goNext = () => {
    if (step === 1) {
      if (!form.title.trim() || form.title.length < 10) { toast.error('Title > 10 chars required'); return; }
      if (!form.category) { toast.error('Category required'); return; }
      if (!form.description.trim() || form.description.length < 20) { toast.error('Description > 20 chars required'); return; }
    }
    if (step === 2 && !form.address.trim()) { toast.error('Address required'); return; }
    setStep(s => s + 1);
  };

  const handleDetailedSubmit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      const { data } = await complaintAPI.create(fd);
      toast.success('✅ Complaint filed successfully!');
      navigate(`/complaint/${data.complaint._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file complaint');
    } finally {
      setLoading(false);
    }
  };

  const StepDot = ({ n }) => (
    <div className="flex flex-col items-center flex-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all z-10 relative
        ${n < step ? 'bg-primary border-primary text-primary-foreground' : n === step ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-background border-border text-muted-foreground'}`}>
        {n < step ? '✓' : n}
      </div>
      <span className={`text-[10px] font-bold mt-1 absolute top-8 whitespace-nowrap ${n === step ? 'text-primary' : n < step ? 'text-primary' : 'text-muted-foreground'}`}>
        {['', 'Details', 'Location', 'Review'][n]}
      </span>
    </div>
  );

  return (
    <div className="flex justify-center w-full py-4 sm:py-8">
      <div className="max-w-4xl w-full px-4 sm:px-0">

        {/* Header Bento Box */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="bg-card rounded-3xl p-8 border border-border shadow-sm mb-8 relative overflow-hidden group text-center md:text-left"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-success via-white to-primary opacity-80" />
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-success/5 rounded-full blur-3xl pointer-events-none group-hover:bg-success/10 transition-colors duration-700" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="font-bold text-4xl lg:text-5xl mb-2 text-foreground tracking-tight">
                Report <span className="text-primary tracking-tight">Issue</span>
              </h1>
              <p className="text-muted-foreground font-medium text-base">Choose the fastest way to file your civic grievance to the right authority.</p>
            </div>
            <div className="flex -space-x-4 opacity-80">
              <div className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-primary"><Zap size={20} /></div>
              <div className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-primary"><Mic size={20} /></div>
              <div className="w-12 h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-primary"><FileText size={20} /></div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="flex bg-secondary/50 rounded-2xl p-1.5 border border-border mb-6 backdrop-blur-md"
        >
          <motion.div
            onClick={() => setActiveTab('quick')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all font-semibold text-sm cursor-pointer gap-1 ${activeTab === 'quick' ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Zap size={18} className={activeTab === 'quick' ? 'text-primary' : ''} /> Quick File
          </motion.div>
          <motion.div
            onClick={() => setActiveTab('voice')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all font-semibold text-sm cursor-pointer gap-1 ${activeTab === 'voice' ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Mic size={18} className={activeTab === 'voice' ? 'text-primary' : ''} /> Voice
          </motion.div>
          <motion.div
            onClick={() => setActiveTab('detailed')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all font-semibold text-sm cursor-pointer gap-1 ${activeTab === 'detailed' ? 'bg-background shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <FileText size={18} className={activeTab === 'detailed' ? 'text-primary' : ''} /> Detailed
          </motion.div>
        </motion.div>

        {/* Tab 1: Quick File */}
        <AnimatePresence mode="exitBeforeEnter">
          {activeTab === 'quick' && (
            <motion.div
              key="quick"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center"
            >
              <AnimatePresence mode="popLayout">
                {!quickResult ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col lg:flex-row gap-8 items-center"
                  >
                    <div className="flex-1 text-left w-full space-y-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg mb-4 border border-primary/20">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> AI Assistant Active
                        </div>
                        <h2 className="font-bold text-4xl text-foreground tracking-tight mb-3">Let AI do the <span className="text-primary">typing.</span></h2>
                        <p className="text-muted-foreground font-medium text-base">Just type one or two sentences describing your issue and its location. We extract the rest.</p>
                      </motion.div>

                      <motion.textarea
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-full bg-secondary/30 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-3xl p-6 text-lg md:text-xl font-medium resize-none min-h-[160px] transition-all shadow-inner text-foreground placeholder-muted-foreground"
                        placeholder="e.g. Broken street light near Metro Station causing dark spots at night..."
                        value={quickText}
                        onChange={e => setQuickText(e.target.value)}
                        disabled={loading}
                      />

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleQuickFile}
                        disabled={loading || !quickText.trim()}
                        className="btn btn-primary w-full py-5 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {loading ? (
                          <><Loader className="animate-spin w-6 h-6" /> {loadingMsg}</>
                        ) : (
                          <><Zap size={20} /> File Report instantly</>
                        )}
                      </motion.button>
                    </div>

                    {/* Visual Graphic Side */}
                    <div className="hidden lg:flex w-72 h-72 bg-gradient-to-br from-primary/10 to-success/10 rounded-full items-center justify-center border border-border shadow-inner relative">
                      <div className="absolute w-full h-full border-2 border-primary/20 rounded-full animate-ping opacity-20" />
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-primary drop-shadow-2xl">
                        <Bot size={80} />
                      </motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="py-4"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 border border-green-500/20"
                    >
                      ✓
                    </motion.div>
                    <h2 className="font-bold text-3xl text-foreground tracking-tight mb-2">Complaint Filed!</h2>
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-secondary/50 rounded-2xl p-5 border border-border text-left max-w-sm mx-auto mb-6"
                    >
                      <h3 className="font-bold text-foreground mb-2 line-clamp-2">{quickResult.title}</h3>
                      <div className="flex gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{quickResult.category}</span>
                        <span className="bg-secondary text-foreground text-xs font-bold px-2 py-1 rounded-full">{quickResult.priority} Priority</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Building2 size={16} className="text-primary" /> Routing to Government Portals...
                      </div>
                    </motion.div>
                    <p className="text-muted-foreground font-medium text-sm">Redirecting to status page...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 2: Voice */}
        <AnimatePresence mode="exitBeforeEnter">
          {activeTab === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm"
            >
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg mb-4 border border-primary/20">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Multilingual Support
                </div>
                <h2 className="font-bold text-3xl md:text-4xl text-foreground tracking-tight mb-3">Speak your <span className="text-primary">Issue</span></h2>
                <p className="text-muted-foreground font-medium text-base mb-8">Record your grievance naturally in Hindi or English (Max 60s). Our AI will summarize it.</p>

                <div className="flex items-center justify-center md:justify-start gap-6">
                  {!transcript && !recording && !voiceResult && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startVoice}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary text-primary-foreground text-4xl flex items-center justify-center shadow-lg shadow-primary/30 transition-all border-4 border-background"
                    ><Mic size={40} /></motion.button>
                  )}

                  {recording && (
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={stopVoice}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-destructive text-destructive-foreground text-3xl flex items-center justify-center shadow-lg shadow-destructive/30 z-10 relative border-4 border-background"
                      >
                        <Square size={32} fill="currentColor" />
                      </motion.button>
                      <div className="absolute inset-0 rounded-full animate-ping bg-destructive opacity-40 border-2 border-background" style={{ animationDuration: '1s' }} />
                      <div className="absolute inset-[-10px] rounded-full animate-ping bg-destructive opacity-20" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
                    </div>
                  )}

                  {/* Status Text next to button */}
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-lg text-foreground">{recording ? 'Listening...' : voiceResult ? 'Processed' : 'Tap to start'}</span>
                    <span className="text-sm font-mono text-muted-foreground">{recording ? formatTime(recSeconds) : '00:00'}</span>
                  </div>
                </div>
              </div>

              {(recording || transcript || interimTranscript) && !voiceResult && (
                <div className="flex-1 w-full bg-secondary/30 rounded-3xl p-6 border border-border shadow-inner mt-8 md:mt-0 flex flex-col">
                  {/* CSS Waveform */}
                  {recording && (
                    <div className="flex items-center justify-center gap-1.5 mb-6 h-8 bg-background/50 rounded-2xl p-2 border border-border/50">
                      {[1, 2, 3, 4, 1, 2, 3, 4].map((v, i) => (
                        <div key={i} className={`w-2 bg-primary rounded-full animate-pulse`} style={{ height: `${v * 8}px`, animationDuration: `${0.3 + (i % 3) * 0.1}s`, animationDirection: 'alternate-reverse' }} />
                      ))}
                    </div>
                  )}

                  <div className="flex-1 bg-background/80 border border-border focus:border-primary rounded-2xl p-5 text-left mb-6 font-medium text-foreground relative min-h-[140px]">
                    <p className="text-lg md:text-xl leading-relaxed">{transcript} <span className="text-muted-foreground animate-pulse">{interimTranscript}</span></p>
                    {!transcript && !interimTranscript && <p className="text-muted-foreground italic absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">Listening for your voice...</p>}
                  </div>

                  {!recording && transcript && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={startVoice} className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold py-4 rounded-xl border border-border transition-colors flex items-center justify-center gap-2">
                        <RotateCcw size={18} /> Retry
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={processVoiceTranscript} disabled={loading} className="flex-[2] btn btn-primary py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Sparkles size={18} /> Extract Details</>}
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {voiceResult && (
                <div className="flex-1 w-full text-left animate-fade-in flex flex-col items-center justify-center p-6 bg-success/10 rounded-3xl border border-success/20">
                  <div className="w-full bg-background border border-border shadow-sm rounded-2xl p-6 mb-5 space-y-4">
                    <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                      <CheckCircle2 size={24} className="text-success" /> AI Extracted Details
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-secondary px-3 py-1.5 rounded-xl text-xs font-bold text-foreground border border-border uppercase tracking-wider">{voiceResult.category}</span>
                      <span className="bg-secondary px-3 py-1.5 rounded-xl text-xs font-bold text-foreground border border-border uppercase tracking-wider">{voiceResult.priority} Priority</span>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Original Transcript</label>
                      <textarea
                        className="w-full bg-secondary/50 border border-border rounded-xl p-4 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[100px] resize-none"
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full gap-3">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setVoiceResult(null); setTranscript(''); }} className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold py-4 rounded-xl border border-border transition-colors">Cancel</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={submitVoiceComplaint} disabled={loading} className="flex-[2] btn btn-success py-4 rounded-xl flex items-center justify-center gap-2 text-success-foreground font-bold text-lg disabled:opacity-50">
                      {loading ? <><Loader className="w-5 h-5 animate-spin" /> Submitting...</> : <><CheckCircle2 size={20} /> File Formal Complaint</>}
                    </motion.button>
                  </div>
                </div>
              )}



              {!speechSupported && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200 w-full mt-4 text-center">
                  Your browser does not support Voice Recognition. Please use Quick File.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 3: Detailed Form */}
        <AnimatePresence mode="exitBeforeEnter">
          {activeTab === 'detailed' && (
            <motion.div
              key="detailed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-card rounded-3xl shadow-sm relative z-10 w-full overflow-hidden border border-border"
            >
              {/* Stepper Header */}
              <div className="flex items-center px-4 sm:px-12 pt-8 pb-4 relative overflow-hidden">
                <div className="absolute top-12 left-12 right-12 h-0.5 bg-secondary z-0" />
                <div className="absolute top-12 left-12 right-12 h-0.5 bg-gradient-to-r from-primary to-success z-0 origin-left transition-transform duration-500" style={{ transform: `scaleX(${(step - 1) / 2})` }} />

                <div className="flex justify-between w-full relative z-10">
                  <StepDot n={1} />
                  <StepDot n={2} />
                  <StepDot n={3} />
                </div>
              </div>

              <div className="p-6 sm:p-10">
                {step === 1 && (
                  <div className="space-y-8 animate-fade-in-up">
                    <div className="grid gap-6">
                      <div>
                        <label className="text-sm font-bold text-foreground mb-2 block tracking-wide uppercase">Issue Title <span className="text-primary">*</span> <span className="text-muted-foreground font-normal float-right normal-case">({form.title.length}/150)</span></label>
                        <input className="w-full bg-secondary/30 border border-border rounded-xl px-5 py-4 focus:border-primary focus:ring-2 focus:ring-primary/20 text-lg font-semibold outline-none transition-all placeholder-muted-foreground shadow-inner" maxLength={150} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Broken water pipe leaking for 2 days" />
                      </div>

                      <div className="bg-background rounded-2xl p-5 border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                          <label className="text-sm font-bold text-foreground block uppercase tracking-wide">Category <span className="text-primary">*</span></label>
                          <button onClick={handleAI} disabled={aiLoading} className="text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60 border border-primary/20">
                            {aiLoading ? '⏳ Detecting...' : '🤖 Auto-Detect with AI'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                              className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 font-bold text-sm ${form.category === cat ? 'border-primary bg-primary/10 text-primary shadow-sm scale-[1.02]' : 'border-border bg-secondary/30 text-foreground hover:bg-secondary hover:border-primary/50'}`}>
                              <div className="text-2xl drop-shadow-sm">
                                {cat === 'Roads' && <MapPin size={24} />}
                                {cat === 'Water' && <Zap size={24} className="text-blue-500" />}
                                {cat === 'Electricity' && <Zap size={24} className="text-yellow-500" />}
                                {cat === 'Sanitation' && <Plus size={24} />}
                                {cat === 'Parks' && <Plus size={24} />}
                                {cat === 'Safety' && <ShieldAlert size={24} />}
                                {cat === 'Noise' && <Mic size={24} />}
                                {cat === 'Other' && <FileText size={24} />}
                              </div>
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-foreground mb-2 block tracking-wide uppercase">Description <span className="text-primary">*</span> <span className="text-muted-foreground font-normal normal-case float-right text-xs mt-1">({form.description.length}/2000)</span></label>
                        <textarea className="w-full min-h-[140px] bg-secondary/30 border border-border rounded-xl px-5 py-4 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y text-foreground font-medium outline-none shadow-inner leading-relaxed placeholder-muted-foreground" maxLength={2000} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Provide precise details like safety concerns, duration of issue, landmarks nearby..." />
                      </div>

                      <div className="bg-background rounded-2xl p-5 border border-border">
                        <label className="text-sm font-bold text-foreground mb-4 block uppercase tracking-wide">Urgency Level</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {PRIORITIES.map(p => (
                            <button key={p.val} onClick={() => setForm(f => ({ ...f, priority: p.val }))}
                              className={`py-3 px-2 rounded-xl border-2 text-center text-sm font-bold transition-all flex justify-center items-center gap-2 ${form.priority === p.val ? (p.val === 'Low' ? 'border-success bg-success/10 text-success' : p.val === 'Medium' ? 'border-primary bg-primary/10 text-primary' : 'border-destructive bg-destructive/10 text-destructive') + ' scale-[1.02] shadow-sm' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                              <span className="text-lg">{p.icon}</span> {p.val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 animate-fade-right">
                    <div className="bg-background rounded-2xl p-6 border border-border shadow-sm space-y-6">
                      <div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                          <label className="text-sm font-bold text-foreground block uppercase tracking-wide">Address / Landmark <span className="text-primary">*</span></label>
                          <button onClick={fetchLocation} className="text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-primary/20">📍 GPS Auto-Locate</button>
                        </div>
                        <input className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium outline-none transition-all placeholder-muted-foreground shadow-inner" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Opposite Sector 4 Community Center" />
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wide">City <span className="text-primary">*</span></label>
                          <input className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium outline-none transition-all placeholder-muted-foreground shadow-inner" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City name" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wide">State <span className="text-primary">*</span></label>
                          <div className="relative">
                            <select className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium outline-none transition-all appearance-none shadow-inner text-foreground" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                              <option value="">— Select Region —</option>
                              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wide">PIN Code</label>
                        <input className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium outline-none transition-all placeholder-muted-foreground shadow-inner max-w-xs" maxLength={6} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/, '') }))} placeholder="6-digit ZIP" />
                      </div>
                    </div>

                    <div className="bg-background rounded-2xl p-6 border border-border shadow-sm">
                      <div className="flex justify-between items-end mb-4">
                        <label className="text-sm font-bold text-foreground block uppercase tracking-wide">Evidence Photos</label>
                        <span className="text-muted-foreground font-bold text-xs bg-secondary px-2 py-1 rounded-md border border-border">{images.length}/3 Uploaded</span>
                      </div>
                      <label className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-10 text-center cursor-pointer flex flex-col items-center justify-center transition-all bg-secondary/20 h-40 group">
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} disabled={images.length >= 3} />
                        <div className="text-muted-foreground group-hover:scale-110 transition-transform drop-shadow-sm mb-3">
                          <Image size={40} />
                        </div>
                        <p className="text-sm font-medium text-foreground"><span className="text-primary font-bold">Tap to upload</span> or drag and drop images here</p>
                      </label>
                      {previews.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-6">
                          {previews.map((src, i) => (
                            <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-border shadow-sm group">
                              <img src={src} alt="" className="w-full h-full object-cover" />
                               <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex bg-secondary/30 border border-border p-5 rounded-2xl items-center gap-4 hover:border-primary/50 transition-colors shadow-sm">
                      <input type="checkbox" id="anon" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="w-6 h-6 rounded text-primary focus:ring-primary border-muted-foreground bg-background" />
                      <label htmlFor="anon" className="text-sm font-bold text-foreground cursor-pointer flex-1 user-select-none">Submit Anonymously <span className="text-muted-foreground font-medium block mt-0.5">Hide my personal identity from public records. Government officials may still see basic contact info.</span></label>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8 animate-fade-right">
                    <div className="bg-background rounded-2xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                          <span className="text-muted-foreground block mb-1.5 text-xs font-bold uppercase tracking-wider">Issue Title</span>
                          <span className="font-bold text-foreground text-lg leading-snug">{form.title}</span>
                        </div>
                        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                          <span className="text-muted-foreground block mb-1.5 text-xs font-bold uppercase tracking-wider">Category</span>
                          <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 inline-block">{form.category}</span>
                        </div>
                        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                          <span className="text-muted-foreground block mb-1.5 text-xs font-bold uppercase tracking-wider">Location</span>
                          <span className="font-semibold text-foreground">{form.city}, {form.state}</span>
                        </div>
                        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                          <span className="text-muted-foreground block mb-1.5 text-xs font-bold uppercase tracking-wider">Urgency Level</span>
                          <span className={`font-bold inline-block px-3 py-1 rounded-lg border ${form.priority === 'Low' ? 'bg-success/10 text-success border-success/20' : form.priority === 'Medium' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>{form.priority}</span>
                        </div>
                      </div>

                      <div className="bg-secondary/30 p-5 rounded-xl border border-border">
                        <span className="text-muted-foreground block mb-2 text-xs font-bold uppercase tracking-wider">Description</span>
                        <p className="text-foreground leading-relaxed font-medium">{form.description}</p>
                      </div>

                      {images.length > 0 && (
                        <div className="bg-secondary/30 p-5 rounded-xl border border-border">
                          <span className="text-muted-foreground block mb-3 text-xs font-bold uppercase tracking-wider">Evidence Photos ({images.length})</span>
                          <div className="flex flex-wrap gap-4">
                            {previews.map((src, i) => <img key={i} src={src} className="w-20 h-20 rounded-xl object-cover border border-border shadow-sm" alt="Evidence" />)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-success/10 border border-success/20 rounded-2xl p-6 flex items-start gap-4">
                      <div className="text-success"><Bot size={32} /></div>
                      <div>
                        <p className="font-bold text-success text-lg flex items-center gap-2">AI Routing Recommendation <span className="bg-success text-success-foreground text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Active</span></p>
                        <p className="text-foreground font-medium mt-1">This <span className="font-bold">{form.category}</span> issue is optimized for <strong>CPGRAMS</strong> or your regional State Service Portal.</p>
                      </div>
                    </div>

                    <label className="flex items-start gap-4 bg-background border border-primary/30 hover:border-primary/60 p-6 rounded-2xl shadow-sm cursor-pointer transition-colors group">
                      <input type="checkbox" id="autosubmit" checked={form.autoSubmit} onChange={e => setForm(f => ({ ...f, autoSubmit: e.target.checked }))} className="w-6 h-6 rounded text-primary focus:ring-primary border-muted-foreground mt-0.5 bg-secondary" />
                      <div>
                        <span className="font-bold text-foreground text-lg flex items-center gap-2"><Building2 size={24} className="text-primary" /> Auto-submit to Government Portal</span>
                        <span className="block text-muted-foreground mt-1 text-sm font-medium leading-relaxed group-hover:text-foreground/80 transition-colors">JantaVoice will automatically forward your ticket to the correct government department, bypass the red tape, and live-track its status for you.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Bar Footer */}
              <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 px-6 sm:px-10 py-6 border-t border-border bg-secondary/20 rounded-b-3xl">
                <button onClick={() => step === 1 ? navigate('/feed') : setStep(s => s - 1)} className="text-muted-foreground font-bold hover:text-foreground py-3 px-6 rounded-xl hover:bg-secondary/80 transition-colors border border-transparent hover:border-border w-full sm:w-auto">
                  {step === 1 ? 'Cancel' : '← Back step'}
                </button>
                {step < 3 ? (
                  <button onClick={goNext} className="btn btn-primary py-3 px-8 w-full sm:w-auto text-lg shadow-lg shadow-primary/20 font-bold">Continue →</button>
                ) : (
                  <button onClick={handleDetailedSubmit} disabled={loading} className="btn btn-success py-3 px-8 w-full sm:w-auto text-lg shadow-lg shadow-success/20 flex items-center justify-center gap-2 disabled:opacity-50 font-bold text-success-foreground">
                    {loading ? <><Loader className="w-5 h-5 animate-spin" /> Submitting</> : '🚀 File Formal Complaint'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
