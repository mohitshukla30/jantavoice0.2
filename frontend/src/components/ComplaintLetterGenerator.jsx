import { useState } from 'react';
import { complaintAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FaDownload, FaCopy, FaWhatsapp, FaEnvelope, FaTimes, FaFileAlt } from 'react-icons/fa';

export default function ComplaintLetterGenerator({ complaint, isOpen, onClose, onGenerated }) {
    const [loading, setLoading] = useState(false);
    const [additionalDetails, setAdditionalDetails] = useState('');

    if (!isOpen || !complaint) return null;

    const isGenerated = !!complaint.referenceNumber;

    const handleGenerateAndDownload = async () => {
        setLoading(true);
        try {
            // Endpoint returns PDF blob and backend updates text in DB
            const { data, headers } = await complaintAPI.generateLetter(complaint._id);

            // Force download of the PDF
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Determine filename from header or fallback
            let filename = `complaint-letter-${complaint._id}.pdf`;
            const cd = headers['content-disposition'];
            if (cd && cd.includes('filename=')) {
                filename = cd.split('filename=')[1].replace(/["']/g, '');
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Letter downloaded successfully!');

            if (onGenerated) onGenerated();
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate letter. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyText = () => {
        if (complaint.formalLetter) {
            navigator.clipboard.writeText(complaint.formalLetter);
            toast.success('Letter text copied to clipboard!');
        }
    };

    const shareWhatsApp = () => {
        if (complaint.formalLetter) {
            const text = encodeURIComponent(`*Complaint Ref: ${complaint.referenceNumber}*\n\n${complaint.formalLetter}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }
    };

    const shareEmail = () => {
        if (complaint.formalLetter) {
            const subject = encodeURIComponent(`Formal Complaint: ${complaint.title}`);
            const body = encodeURIComponent(complaint.formalLetter);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-800">
                        <FaFileAlt className="text-saffron" />
                        <h2 className="font-heading font-bold text-lg">Official Complaint Letter</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                    {!isGenerated ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Generate a formal, government-style complaint letter automatically from your submission details using AI. The result will be a downloadable PDF.
                            </p>

                            <div className="bg-saffron-pale border border-saffron/20 p-4 rounded-xl space-y-2">
                                <h3 className="font-bold text-sm text-saffron-dark">Details to be included:</h3>
                                <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                                    <li><strong>Title:</strong> {complaint.title}</li>
                                    <li><strong>Category:</strong> {complaint.category}</li>
                                    <li><strong>Location:</strong> {complaint.location.address}, {complaint.location.city}</li>
                                    <li><strong>Complainant:</strong> {complaint.user.name}</li>
                                </ul>
                            </div>

                            <div>
                                <label className="label">Additional Details (Optional)</label>
                                <textarea
                                    className="input min-h-[80px] text-sm"
                                    placeholder="e.g. I already complained to the local corporator on Monday but no action was taken."
                                    value={additionalDetails}
                                    onChange={(e) => setAdditionalDetails(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleGenerateAndDownload}
                                disabled={loading}
                                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-bold shadow-md hover:shadow-lg transition-all"
                            >
                                {loading ? '⏳ AI is drafting your letter...' : '🤖 Generate Letter & Download'}
                            </button>
                            {loading && <p className="text-center text-xs text-gray-400 mt-2 animate-pulse">This might take a few seconds as the AI reads your complaint.</p>}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 font-serif text-gray-800 text-sm leading-relaxed max-h-[50vh] overflow-y-auto">
                                <div className="text-center mb-6 border-b-2 border-double border-gray-300 pb-4">
                                    <h1 className="font-sans font-bold text-lg tracking-wide">JANTA VOICE COMPLAINT PORTAL</h1>
                                    <div className="flex">
                                        <div className="h-1 flex-1 bg-[#FF9933]"></div>
                                        <div className="h-1 flex-1 bg-white"></div>
                                        <div className="h-1 flex-1 bg-[#138808]"></div>
                                    </div>
                                </div>

                                <div className="flex justify-between font-bold mb-4 text-xs font-sans">
                                    <span>Ref: {complaint.referenceNumber}</span>
                                </div>

                                <div className="whitespace-pre-wrap">
                                    {complaint.formalLetter}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button onClick={handleGenerateAndDownload} disabled={loading} className="flex flex-col items-center justify-center gap-1 p-3 bg-saffron text-white rounded-xl hover:bg-saffron-dark transition-colors shadow-sm text-xs font-bold disabled:opacity-70">
                                    {loading ? '⏳...' : <><FaDownload className="text-lg mb-1" /> Re-Download PDF</>}
                                </button>
                                <button onClick={copyText} className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-xs font-bold">
                                    <FaCopy className="text-lg mb-1" /> Copy Text
                                </button>
                                <button onClick={shareWhatsApp} className="flex flex-col items-center justify-center gap-1 p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors text-xs font-bold border border-green-200">
                                    <FaWhatsapp className="text-xl mb-1" /> WhatsApp
                                </button>
                                <button onClick={shareEmail} className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-xs font-bold border border-blue-200">
                                    <FaEnvelope className="text-lg mb-1" /> Email
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
