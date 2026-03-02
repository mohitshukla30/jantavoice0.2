import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';

const steps = [
  { num: '01', icon: '📝', title: 'File a Complaint', desc: 'Describe the civic issue, add a photo, and drop the location. AI helps auto-categorize it.' },
  { num: '02', icon: '🤖', title: 'AI Categorization', desc: 'Groq AI instantly categorizes your complaint and suggests priority level automatically.' },
  { num: '03', icon: '👥', title: 'Community Support', desc: 'Fellow citizens can like your complaint, boosting its visibility and priority for action.' },
  { num: '04', icon: '✅', title: 'Track & Resolve', desc: 'Get real-time notifications as authorities move your complaint from Reported to Resolved.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-saffron/5 blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-india-green/5 blur-3xl" />
          <div className="absolute top-1/2 right-[10%] text-[320px] opacity-[0.03] text-ashoka select-none" style={{ fontFamily: 'serif' }}>☸</div>
        </div>

        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center pt-20">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-saffron-pale border border-saffron/20 rounded-full px-4 py-1.5 text-xs font-bold text-saffron-dark tracking-widest uppercase mb-6">
              🇮🇳 Civic Tech Platform for India
            </div>
            <h1 className="font-heading font-bold leading-none mb-4" style={{ fontSize: 'clamp(3rem,6vw,5rem)' }}>
              Your Voice.<br />
              <span className="text-saffron">Real Issues.</span><br />
              <span className="text-india-green">Real Change.</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
              File civic complaints, track them in real-time, and let AI help authorities respond faster. Every pothole, power cut, and water shortage — reported, tracked, resolved.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/report" className="btn-primary flex items-center gap-2 text-base">
                📢 Report an Issue
              </Link>
              <Link to="/feed" className="btn-secondary flex items-center gap-2 text-base">
                Browse Complaints <FaChevronRight className="text-xs" />
              </Link>
            </div>
          </div>

          <div className="mt-10 md:mt-0 md:block">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-saffron to-saffron-dark p-5 text-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-heading font-bold text-lg flex items-center gap-2">
                    <img src="/logo.jpeg" alt="Janta Voice" className="w-6 h-6 object-contain bg-white rounded px-0.5" />
                    Janta Voice
                  </span>
                  <span className="bg-white/25 text-xs font-bold px-3 py-1 rounded-full">● LIVE</span>
                </div>
                <div className="bg-white rounded-xl p-3 space-y-2.5">
                  {[
                    { icon: '🛣️', title: 'Pothole on main road near bus stop', city: 'Pune', status: 'In Progress', sc: 'text-amber-600 bg-amber-50' },
                    { icon: '💧', title: 'No water supply for 3 days', city: 'Mumbai', status: 'Reported', sc: 'text-red-600 bg-red-50' },
                    { icon: '⚡', title: 'Street light malfunction — fixed!', city: 'Delhi', status: 'Resolved', sc: 'text-india-green bg-india-green-pale' },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-saffron-pale rounded-lg flex items-center justify-center text-base flex-shrink-0">{c.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{c.title}</p>
                        <p className="text-[10px] text-gray-400">📍 {c.city}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline-block ${c.sc}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100 px-2 py-3 bg-white">
                {[['📋', 'Complaints', 'Filed by citizens'], ['✅', 'Resolved', 'Issues closed'], ['🏙️', 'Cities', 'Across India']].map(([ic, label, sub]) => (
                  <div key={label} className="text-center px-2 py-2">
                    <div className="text-xl mb-0.5">{ic}</div>
                    <div className="font-heading font-bold text-gray-800 text-sm">{label}</div>
                    <div className="text-[10px] text-gray-400 hidden sm:block">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold tracking-widest uppercase text-saffron-dark mb-2">Simple Process</p>
          <h2 className="font-heading font-bold text-4xl text-center mb-12">How Janta Voice Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map(s => (
              <div key={s.num} className="bg-white border border-gray-200 rounded-2xl p-5 relative hover:border-saffron hover:-translate-y-1 transition-all shadow-sm hover:shadow-md">
                <div className="font-heading font-bold text-5xl text-saffron/15 absolute top-3 right-4">{s.num}</div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-heading font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}

            {/* NEW FEATURES ROW */}
            <div className="bg-white border text-center border-gray-200 rounded-2xl p-5 relative hover:border-saffron hover:-translate-y-1 transition-all shadow-sm hover:shadow-md">
              <div className="font-heading font-bold text-5xl text-saffron/15 absolute top-3 right-4">🎤</div>
              <div className="text-3xl mb-3">🎤</div>
              <h3 className="font-heading font-bold text-lg mb-2">Voice Complaints</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Speak in Hindi or English. AI transcribes and files for you.</p>
            </div>

            <div className="bg-white border text-center border-gray-200 rounded-2xl p-5 relative hover:border-saffron hover:-translate-y-1 transition-all shadow-sm hover:shadow-md">
              <div className="font-heading font-bold text-5xl text-saffron/15 absolute top-3 right-4">🏛️</div>
              <div className="text-3xl mb-3">🏛️</div>
              <h3 className="font-heading font-bold text-lg mb-2">Gov Portal Integration</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Auto-submit to CPGRAMS and track official ticket status live.</p>
            </div>

            <div className="bg-white border text-center border-gray-200 rounded-2xl p-5 relative hover:border-saffron hover:-translate-y-1 transition-all shadow-sm hover:shadow-md">
              <div className="font-heading font-bold text-5xl text-saffron/15 absolute top-3 right-4">🤖</div>
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="font-heading font-bold text-lg mb-2">Smart Automation</h3>
              <p className="text-gray-500 text-sm leading-relaxed">AI auto-escalates, follows up, and updates you without any manual work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-r from-saffron to-saffron-dark text-white text-center">
        <h2 className="font-heading font-bold text-4xl mb-3">Be the Change. File a Complaint Today.</h2>
        <p className="opacity-90 mb-6 text-lg">Powered by Groq AI for faster, smarter civic resolution.</p>
        <Link to="/register" className="bg-white text-saffron-dark font-bold text-base px-8 py-3 rounded-xl hover:-translate-y-1 transition-all shadow-lg hover:shadow-xl inline-block">
          Get Started — It's Free
        </Link>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="font-heading font-bold text-white text-lg flex items-center gap-2">
            <img src="/logo.jpeg" alt="Janta Voice Logo" className="w-7 h-7 object-contain bg-white rounded p-0.5" />
            <span><span className="text-saffron">JANTA</span> VOICE</span>
          </div>
          <span>Raise. Report. Resolve.</span>
          <span>Built for the citizens of India 🇮🇳</span>
        </div>
      </footer>
    </div>
  );
}
