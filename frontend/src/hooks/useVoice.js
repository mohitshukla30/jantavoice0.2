import { useState, useRef, useCallback, useEffect } from 'react';

export default function useVoice(initialLang = 'hi-IN') {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [error, setError] = useState(null);
    const [lang, setLang] = useState(initialLang);
    const recognitionRef = useRef(null);
    const silenceRef = useRef(null);

    const start = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setError('Voice not supported. Use Chrome browser.'); return; }

        // Cleanup any existing instance
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const r = new SR();
        r.lang = lang;
        r.continuous = true;
        r.interimResults = true;

        r.onresult = e => {
            clearTimeout(silenceRef.current);
            let interim = '', final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    final += t + ' ';
                } else {
                    interim += t;
                }
            }
            setInterimText(interim);
            if (final) {
                setTranscript(p => (p + ' ' + final).trim());
            }
            silenceRef.current = setTimeout(() => stop(), 3000);
        };

        r.onerror = e => {
            // Only set error if not aborted
            if (e.error !== 'aborted') {
                setError('Mic error: ' + e.error);
            }
            setIsRecording(false);
        };

        r.onend = () => {
            setIsRecording(false);
            setInterimText('');
        };

        recognitionRef.current = r;
        r.start();
        setIsRecording(true);
        setTranscript('');
        setInterimText('');
        setError(null);
    }, [lang]);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
        setInterimText('');
        clearTimeout(silenceRef.current);
    }, []);

    const reset = () => { setTranscript(''); setInterimText(''); setError(null); };

    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            clearTimeout(silenceRef.current);
        };
    }, []);

    return { isRecording, transcript, interimText, error, lang, setLang, start, stop, reset };
}
