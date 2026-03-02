import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import VoiceRecorder from '../components/VoiceRecorder';
import { STATES } from '../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Safety', 'Noise', 'Other'];
const PRIORITIES = [
  { val: 'Low', icon: '🟢', color: 'border-india-green bg-india-green-pale text-india-green' },
  { val: 'Medium', icon: '🟡', color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { val: 'High', icon: '🟠', color: 'border-saffron bg-saffron-pale text-saffron-dark' },
  { val: 'Critical', icon: '🔴', color: 'border-red-500 bg-red-50 text-red-700' },
];

export default function ReportPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [inputMode, setInputMode] = useState('manual');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
    address: '', city: '', state: '', pincode: '', isAnonymous: false,
  });

  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login', { state: { from: { pathname: '/report' } } }); }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'voice') {
      setInputMode('voice');
    }
  }, [location]);

  const handleAI = async () => {
    if (!form.title || !form.description) { toast.error('Enter title and description first'); return; }
    setAiLoading(true);
    try {
      const { data } = await complaintAPI.aiCategorize({ title: form.title, description: form.description });
      if (data.success && data.result) {
        setForm(f => ({
          ...f,
          category: data.result.category || f.category,
          priority: data.result.priority || f.priority,
        }));
        toast.success('🤖 AI suggested category & priority!');
      } else {
        toast('AI unavailable, please select manually', { icon: 'ℹ️' });
      }
    } catch { toast('AI categorization unavailable', { icon: 'ℹ️' }); }
    finally { setAiLoading(false); }
  };

  const handleImages = (e) => {
    const allFiles = Array.from(e.target.files);
    const validFiles = [];
    let hasLargeFile = false;

    for (let f of allFiles) {
      if (f.size > 5 * 1024 * 1024) {
        hasLargeFile = true;
      } else {
        validFiles.push(f);
      }
    }

    if (hasLargeFile) {
      toast.error('One or more files exceed the 5MB limit and were skipped.');
    }

    const filesToAdd = validFiles.slice(0, 3 - images.length);
    setImages(prev => [...prev, ...filesToAdd].slice(0, 3));
    filesToAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target.result].slice(0, 3));
      reader.readAsDataURL(f);
    });
  };

  const handleUseComplaint = (data) => {
    setForm(f => ({
      ...f,
      title: data.title,
      description: data.description,
      category: data.category || f.category,
      priority: data.priority || f.priority,
    }));
    setInputMode('manual');
    toast.success('Complaint details filled! You can review and proceed.');
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const goNext = () => {
    if (step === 1) {
      if (!form.title.trim() || form.title.length < 10) { toast.error('Title must be at least 10 characters'); return; }
      if (!form.category) { toast.error('Please select a category'); return; }
      if (!form.description.trim() || form.description.length < 20) { toast.error('Description must be at least 20 characters'); return; }
    }
    if (step === 2) {
      if (!form.address.trim()) { toast.error('Address is required'); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
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
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
        ${n < step ? 'bg-india-green border-india-green text-white' :
          n === step ? 'bg-saffron border-saffron text-white shadow-md' :
            'bg-white border-gray-300 text-gray-400'}`}>
        {n < step ? '✓' : n}
      </div>
      <span className={`text-[10px] font-bold mt-1 ${n === step ? 'text-saffron-dark' : n < step ? 'text-india-green' : 'text-gray-400'}`}>
        {['', 'Basic Info', 'Location', 'Review'][n]}
      </span>
    </div>
  );

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-heading font-bold text-3xl mb-1">File a <span className="text-saffron">Complaint</span></h1>
        <p className="text-gray-500 text-sm mb-6">All fields marked * are required.</p>

        {/* Steps */}
        <div className="flex items-center mb-7">
          <StepDot n={1} />
          <div className={`flex-1 h-0.5 ${step > 1 ? 'bg-india-green' : 'bg-gray-200'}`} />
          <StepDot n={2} />
          <div className={`flex-1 h-0.5 ${step > 2 ? 'bg-india-green' : 'bg-gray-200'}`} />
          <StepDot n={3} />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-saffron-pale rounded-xl flex items-center justify-center text-xl">📋</div>
                  <div><h2 className="font-heading font-bold text-xl">Basic Information</h2><p className="text-xs text-gray-400">What is the issue?</p></div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
                  <button
                    onClick={() => setInputMode('manual')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${inputMode === 'manual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    ✍️ Type Manually
                  </button>
                  <button
                    onClick={() => setInputMode('voice')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${inputMode === 'voice' ? 'bg-white text-saffron-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    🎤 Voice Input
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {inputMode === 'voice' ? (
                  <VoiceRecorder onUseComplaint={handleUseComplaint} />
                ) : (
                  <>
                    <div>
                      <label className="label">Issue Title * <span className="text-gray-400 font-normal text-xs">({form.title.length}/150)</span></label>
                      <input className="input" maxLength={150} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Pothole on main road causing accidents" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="label m-0">Category *</label>
                        <button onClick={handleAI} disabled={aiLoading} className="text-xs font-bold text-saffron-dark bg-saffron-pale px-3 py-1 rounded-lg hover:bg-saffron/20 transition-colors flex items-center gap-1 disabled:opacity-60">
                          {aiLoading ? '⏳ Detecting...' : '🤖 Auto-detect with AI'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {CATEGORIES.map(cat => (
                          <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                            className={`p-2.5 rounded-xl border-2 text-center transition-all text-xs font-bold
                          ${form.category === cat ? 'border-saffron bg-saffron-pale text-saffron-dark' : 'border-gray-200 text-gray-500 hover:border-saffron/40'}`}>
                            <div className="text-xl mb-0.5">{['🛣️', '💧', '⚡', '🗑️', '🌳', '🛡️', '🔊', '📋'][CATEGORIES.indexOf(cat)]}</div>
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Description * <span className="text-gray-400 font-normal text-xs">({form.description.length}/2000)</span></label>
                      <textarea className="input min-h-[120px]" maxLength={2000} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail. Include how long it has been there, who is affected, any safety concerns." />
                    </div>
                    <div>
                      <label className="label">Priority</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRIORITIES.map(p => (
                          <button key={p.val} onClick={() => setForm(f => ({ ...f, priority: p.val }))}
                            className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${form.priority === p.val ? p.color + ' border-2 scale-105 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                            <div className="text-lg mb-0.5">{p.icon}</div>{p.val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-saffron-pale rounded-xl flex items-center justify-center text-xl">📍</div>
                <div><h2 className="font-heading font-bold text-xl">Location & Photos</h2><p className="text-xs text-gray-400">Where is the issue?</p></div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="label">Address / Landmark *</label>
                  <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Near City Bank, MG Road" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">City *</label>
                    <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City name" />
                  </div>
                  <div>
                    <label className="label">State *</label>
                    <select className="input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                      <option value="">— Select State —</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">PIN Code</label>
                  <input className="input" maxLength={6} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/, '') }))} placeholder="6-digit PIN code" />
                </div>

                <div>
                  <label className="label">Photos <span className="text-gray-400 font-normal text-xs">({images.length}/3 uploaded)</span></label>
                  <label className="border-2 border-dashed border-gray-200 hover:border-saffron rounded-xl p-6 text-center cursor-pointer block transition-colors hover:bg-saffron-pale/30">
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} disabled={images.length >= 3} />
                    <div className="text-3xl mb-2">📎</div>
                    <p className="text-sm text-gray-500"><span className="text-saffron-dark font-bold">Click to upload</span> or drag & drop</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — Max 5MB each</p>
                  </label>
                  {previews.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {previews.map((src, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Submit Anonymously</label>
                  <button onClick={() => setForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}
                    className={`flex items-center gap-3 w-full border-2 rounded-xl p-3 text-left transition-all ${form.isAnonymous ? 'border-india-green bg-india-green-pale' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${form.isAnonymous ? 'bg-india-green' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isAnonymous ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Hide my identity from public</p>
                      <p className="text-xs text-gray-500">Your name won't appear on the complaint</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-india-green-pale rounded-xl flex items-center justify-center text-xl">✅</div>
                <div><h2 className="font-heading font-bold text-xl">Review & Submit</h2><p className="text-xs text-gray-400">Check before filing</p></div>
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
                  {[
                    ['Title', form.title],
                    ['Category', form.category],
                    ['Priority', form.priority],
                    ['Location', `${form.address}${form.city ? ', ' + form.city : ''}${form.state ? ', ' + form.state : ''}`],
                    ['Photos', `${images.length} uploaded`],
                    ['Anonymous', form.isAnonymous ? 'Yes' : 'No'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-3 text-sm">
                      <span className="text-gray-400 font-semibold w-20 flex-shrink-0">{label}</span>
                      <span className="font-bold text-gray-800">{val || '—'}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
                  ⚠️ Once submitted, this complaint becomes publicly visible and cannot be edited.
                </div>
              </div>
            </>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between p-4 border-t border-gray-100 bg-gray-50">
            <button onClick={() => step === 1 ? navigate('/feed') : setStep(s => s - 1)} className="btn-secondary py-2.5 px-5 text-sm">
              {step === 1 ? '← Cancel' : '← Back'}
            </button>
            {step < 3
              ? <button onClick={goNext} className="btn-primary py-2.5 px-6 text-sm">Next →</button>
              : <button onClick={handleSubmit} disabled={loading} className="btn-green py-2.5 px-6 text-sm disabled:opacity-60">
                {loading ? 'Submitting...' : '✅ Submit Complaint'}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
