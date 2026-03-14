import { useState, useRef, useEffect } from 'react';
import { complaintAPI } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, StopCircle, Bot, Loader2, CheckCircle2, Tag, Zap, RotateCcw } from 'lucide-react';

export default function VoiceRecorder({ onTranscribe, onUseComplaint }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcriptData, setTranscriptData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      stopRecordingFlow();
    };
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgba(250, 250, 249, 0.5)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        canvasCtx.fillStyle = '#FF9933'; // Saffron
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const startRecording = async () => {
    setError('');
    setTranscriptData(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setSeconds(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(console.error);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 59) {
            stopRecording();
            return 60;
          }
          return s + 1;
        });
      }, 1000);

      drawWaveform();
    } catch (err) {
      console.error(err);
      setError('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopRecordingFlow();
  };

  const stopRecordingFlow = () => {
    setRecording(false);
    clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'complaint.webm');

      const { data } = await complaintAPI.transcribeAudio(formData);
      if (data.success) {
        setTranscriptData({
          transcript: data.transcript,
          category: data.category,
          priority: data.priority,
          summary: data.summary,
        });
        toast.success('Audio analyzed successfully!');
        if (onTranscribe) onTranscribe(data.transcript);
      } else {
        throw new Error(data.message || 'Transcription failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Error occurred during transcription.');
      toast.error('Failed to analyze audio.');
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!transcriptData) return;
    onUseComplaint?.({
      title: transcriptData.summary || transcriptData.transcript.split('.')[0].substring(0, 100),
      description: transcriptData.transcript,
      category: transcriptData.category,
      priority: transcriptData.priority,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[220px]">
      <AnimatePresence mode="wait">
        {!audioUrl && (
          <motion.div 
            key="recording-ui"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center w-full relative h-full"
          >
            {error && <div className="absolute top-0 text-white text-xs bg-destructive px-4 py-1.5 rounded-full shadow-lg z-20 font-bold">{error}</div>}

            <div className="relative flex items-center justify-center">
              {recording && (
                <>
                  <motion.div 
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/20 rounded-full" 
                  />
                  <motion.div 
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute inset-0 bg-primary/10 rounded-full" 
                  />
                </>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={recording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl z-10 relative
                  ${recording 
                    ? 'bg-primary text-white shadow-primary/40' 
                    : 'bg-white hover:bg-secondary text-primary border-4 border-primary/5 hover:scale-105'}`}
              >
                {recording ? <StopCircle size={36} className="animate-pulse" /> : <Mic size={36} />}
              </motion.button>
            </div>

            <div className={`mt-6 font-mono font-bold text-xl transition-all duration-300 ${recording ? 'text-primary' : 'text-muted-foreground'}`}>
              {recording ? formatTime(seconds) : 'Tap to Speak'}
            </div>

            {recording && (
              <div className="mt-4 w-48 h-10 bg-secondary/50 rounded-full overflow-hidden border border-border">
                <canvas ref={canvasRef} width="192" height="40" className="w-full h-full opacity-60" />
              </div>
            )}
          </motion.div>
        )}

        {audioUrl && !transcriptData && (
          <motion.div 
            key="preview-ui"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center w-full max-w-sm"
          >
            <div className="w-full bg-secondary/30 p-4 rounded-2xl border border-border mb-6">
              <audio src={audioUrl} controls className="w-full h-10" />
            </div>

            <div className="flex gap-3 w-full">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setAudioUrl(null); setAudioBlob(null); }}
                className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                disabled={loading}
              >
                <RotateCcw size={16} /> Retake
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTranscribe}
                className="btn btn-primary flex-[1.5] flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                {loading ? 'Analyzing...' : 'Analyze with AI'}
              </motion.button>
            </div>
            {error && <div className="text-destructive text-sm mt-4 font-bold">{error}</div>}
          </motion.div>
        )}

        {transcriptData && (
          <motion.div 
            key="result-ui"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Bot size={20} className="text-primary" /> AI Analysis
              </h3>
              <button 
                onClick={() => { setAudioUrl(null); setAudioBlob(null); setTranscriptData(null); }} 
                className="text-xs text-primary font-bold hover:underline"
              >
                Start Over
              </button>
            </div>

            <div className="bg-secondary/40 border border-border rounded-2xl p-5 mb-5 shadow-sm space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold text-foreground border border-border flex items-center gap-1.5 shadow-sm">
                  <Tag size={12} className="text-primary" /> {transcriptData.category}
                </span>
                <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold text-foreground border border-border flex items-center gap-1.5 shadow-sm">
                  <Zap size={12} className="text-primary" /> {transcriptData.priority} Priority
                </span>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transcript</label>
                <p className="text-sm text-foreground font-medium leading-relaxed bg-white/50 p-4 rounded-xl border border-border shadow-inner">
                  {transcriptData.transcript}
                </p>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUse} 
              className="btn btn-success w-full py-4 shadow-lg shadow-success/20 flex items-center justify-center gap-2 font-bold"
            >
              <CheckCircle2 size={20} /> Use This Report
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
