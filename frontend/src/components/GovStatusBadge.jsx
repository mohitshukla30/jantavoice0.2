import { FaClock, FaCheckCircle, FaTimesCircle, FaPaperPlane, FaSpinner, FaBuilding } from 'react-icons/fa';

export default function GovStatusBadge({ status }) {
    const getBadgeStyle = () => {
        const s = status?.toLowerCase() || '';
        if (s.includes('submitted')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s.includes('process') || s.includes('pending')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (s.includes('resolved') || s.includes('closed') || s.includes('disposed')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('rejected')) return 'bg-red-100 text-red-700 border-red-200';
        if (s.includes('ministry')) return 'bg-purple-100 text-purple-700 border-purple-200';
        if (s.includes('action')) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getIcon = () => {
        const s = status?.toLowerCase() || '';
        if (s.includes('submitted')) return <FaPaperPlane className="text-xs" />;
        if (s.includes('process') || s.includes('pending')) return <FaSpinner className="text-xs animate-spin-slow" />;
        if (s.includes('resolved') || s.includes('closed') || s.includes('disposed')) return <FaCheckCircle className="text-xs" />;
        if (s.includes('rejected')) return <FaTimesCircle className="text-xs" />;
        if (s.includes('ministry')) return <FaBuilding className="text-xs" />;
        return <FaClock className="text-xs" />;
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getBadgeStyle()}`}>
            {getIcon()}
            {status || 'Unknown'}
        </span>
    );
}
