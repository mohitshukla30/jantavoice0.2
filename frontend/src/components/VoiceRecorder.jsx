import { useState, useRef, useEffect } from 'react';
import { complaintAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function VoiceRecorder({ onUseComplaint }) {
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

        // Clear canvas first
        canvasCtx.fillStyle = '#f8fafc';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyserRef.current.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = '#f8fafc';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                canvasCtx.fillStyle = '#f97316';
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
            analyser.fftSize = 256;
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

            // Timer setup
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
                toast.success('Audio transcribed successfully!');
            } else {
                throw new Error(data.message || 'Transcription failed');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Error occurred during transcription.');
            toast.error('Failed to transcribe audio.');
        } finally {
            setLoading(false);
        }
    };

    const handleTranscriptChange = (e) => {
        setTranscriptData(prev => ({ ...prev, transcript: e.target.value }));
    };

    const handleUseComplaint = () => {
        if (!transcriptData) return;

        const title = transcriptData.summary || transcriptData.transcript.split('.')[0].substring(0, 100);

        onUseComplaint({
            title: title,
            description: transcriptData.transcript,
            category: transcriptData.category,
            priority: transcriptData.priority,
        });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col items-center">
            <div className="text-center mb-6">
                <h2 className="font-heading font-bold text-xl mb-1">🎤 Voice Complaint</h2>
                <p className="text-xs text-gray-400">Record your civic issue in Hindi or English</p>
            </div>

            {!audioUrl && (
                <div className="flex flex-col items-center w-full">
                    {error && <div className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl w-full text-center">{error}</div>}

                    <div className="relative mb-6">
                        <button
                            onClick={recording ? stopRecording : startRecording}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all shadow-md z-10 relative
                ${recording ? 'bg-red-50 text-red-500 border-2 border-red-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                        >
                            {recording ? '⏹️' : '🎙️'}
                        </button>
                        {recording && (
                            <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" style={{ animationDuration: '1.5s' }} />
                        )}
                    </div>

                    <div className="text-2xl font-heading font-bold mb-4 font-mono text-gray-700">
                        {formatTime(seconds)}
                    </div>

                    <div className="w-full max-w-sm h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 mb-2 relative">
                        <canvas ref={canvasRef} width="400" height="64" className="w-full h-full" />
                        {!recording && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 font-bold">Ready to Record</div>}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Max 60 Seconds</p>
                </div>
            )}

            {audioUrl && !transcriptData && (
                <div className="flex flex-col items-center w-full max-w-md animate-fade-up">
                    <audio src={audioUrl} controls className="w-full mb-6" />

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => { setAudioUrl(null); setAudioBlob(null); setTranscriptData(null); }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-xl flex-1 transition-colors"
                            disabled={loading}
                        >
                            Retake
                        </button>
                        <button
                            onClick={handleTranscribe}
                            className="btn-primary flex-[2] py-2 flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? '⏳ AI is transcribing...' : '🤖 Transcribe with AI'}
                        </button>
                    </div>
                    {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
                </div>
            )}

            {transcriptData && (
                <div className="w-full max-w-lg animate-fade-up">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-heading font-bold text-lg">AI Analysis Result</h3>
                        <button onClick={() => { setAudioUrl(null); setAudioBlob(null); setTranscriptData(null); }} className="text-xs text-saffron font-bold hover:underline">
                            Start Over
                        </button>
                    </div>

                    <div className="bg-saffron-pale border border-saffron/20 rounded-xl p-4 mb-4">
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="bg-white px-2 py-1 rounded text-xs font-bold text-gray-700 border border-gray-200 flex items-center gap-1">
                                🏷️ {transcriptData.category}
                            </span>
                            <span className="bg-white px-2 py-1 rounded text-xs font-bold text-gray-700 border border-gray-200 flex items-center gap-1">
                                ⚡ {transcriptData.priority} Priority
                            </span>
                        </div>
                        {transcriptData.summary && (
                            <p className="text-sm text-gray-800 font-semibold mb-3">"{transcriptData.summary}"</p>
                        )}

                        <label className="text-xs font-bold text-gray-500 mb-1 block">Full Transcript (Editable)</label>
                        <textarea
                            value={transcriptData.transcript}
                            onChange={handleTranscriptChange}
                            className="w-full p-3 text-sm rounded-lg border border-saffron/30 bg-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-saffron"
                        />
                    </div>

                    <button onClick={handleUseComplaint} className="btn-green w-full py-3 shadow-lg">
                        ✅ Use This Complaint
                    </button>
                </div>
            )}
        </div>
    );
}
