import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Wand2, Loader } from 'lucide-react';
import { complaintAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LettersPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState(null);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const { data } = await complaintAPI.getMy();
            setComplaints(data.complaints);
        } catch (err) {
            toast.error('Failed to load complaints');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (id, title) => {
        setGeneratingId(id);
        const toastId = toast.loading(`🤖 AI is drafting "${title.substring(0, 20)}..."`);
        try {
            const res = await complaintAPI.getLetter(id);
            const blob = new Blob([res.data], { type: 'application/pdf' });

            // Extract filename from header if possible
            const disposition = res.headers['content-disposition'];
            let filename = 'complaint-letter.pdf';
            if (disposition && disposition.indexOf('attachment') !== -1) {
                var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                var matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            toast.success(`Letter downloaded!`, { id: toastId });
            // Refresh to show it exists now
            fetchComplaints();
        } catch (err) {
            console.error('PDF error:', err);
            toast.error('Failed to generate letter', { id: toastId });
        } finally {
            setGeneratingId(null);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center pt-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
    }

    const availableLetters = complaints.filter(c => c.formalLetter && !c.formalLetter.includes('Sample formal letter text.'));
    const pendingLetters = complaints.filter(c => !c.formalLetter || c.formalLetter.includes('Sample formal letter text.'));

    return (
        <div className="max-w-4xl mx-auto space-y-8 pt-24 px-4 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight">
                    <FileText className="text-primary w-8 h-8" />
                    Formal Complaint Letters
                </h1>
                <p className="text-muted-foreground font-medium mt-3">Generate and download official PDF copies of your complaints formatted for Indian Government submission.</p>
            </div>

            {/* Existing Letters */}
            <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight border-b border-border pb-3 mb-5">Generated Letters</h2>
                {availableLetters.length === 0 ? (
                    <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground font-medium">
                        No formal letters generated yet. Generate one from the list below.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {availableLetters.map(c => (
                            <div key={c._id} className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-primary/50 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground text-base line-clamp-1">{c.title}</h3>
                                        <div className="text-xs text-muted-foreground font-medium mt-1.5 flex items-center flex-wrap gap-3">
                                            <span className="bg-secondary text-foreground px-2 py-1 rounded-md font-mono font-bold tracking-wider">Ref: {c.referenceNumber}</span>
                                            <span>Issued: {new Date(c.letterGeneratedAt || c.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleGenerate(c._id, c.title)}
                                    disabled={generatingId === c._id}
                                    className="btn btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
                                >
                                    {generatingId === c._id ? <Loader className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                                    <span className="hidden sm:inline">Download PDF</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Generate New */}
            <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight border-b border-border pb-3 mb-5 mt-4">Available For Generation</h2>
                {pendingLetters.length === 0 ? (
                    <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground font-medium">
                        You have no other complaints waiting for letters.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingLetters.map(c => (
                            <div key={c._id} className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-foreground text-base line-clamp-1">{c.title}</h3>
                                    <span className="text-xs text-muted-foreground font-medium mt-1.5 block">Status: {c.status} • Filed: {new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                <button
                                    onClick={() => handleGenerate(c._id, c.title)}
                                    disabled={generatingId === c._id}
                                    className="btn btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                                >
                                    {generatingId === c._id ? <Loader className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                                    <span className="hidden sm:inline">Generate Letter</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
