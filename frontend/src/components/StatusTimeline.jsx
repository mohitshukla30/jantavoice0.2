import { Check, Circle } from 'lucide-react';

export default function StatusTimeline({ statusHistory = [], currentStatus }) {
  const steps = ['Reported', 'In Progress', 'Resolved'];
  const currentIdx = steps.indexOf(currentStatus);

  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => {
        const done = i < currentIdx || (currentStatus === 'Resolved' && i <= 2);
        const active = step === currentStatus;
        const hist = statusHistory.find(h => h.status === step);
        return (
          <div key={step} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className={`flex-1 h-0.5 ${done || active ? 'bg-india-green' : 'bg-gray-200'}`} />
              )}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${done ? 'bg-india-green border-india-green text-white' :
                  active ? 'bg-saffron border-saffron text-white shadow-md shadow-saffron/30' :
                  'bg-white border-gray-300 text-gray-400'}`}>
                {done ? <Check size={14} /> : active ? <Circle size={8} fill="currentColor" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${done ? 'bg-india-green' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="mt-1.5 text-center">
              <p className={`text-[10px] font-bold ${done ? 'text-india-green' : active ? 'text-saffron-dark' : 'text-gray-400'}`}>{step}</p>
              {hist?.changedAt && <p className="text-[9px] text-gray-400">{new Date(hist.changedAt).toLocaleDateString('en-IN')}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
