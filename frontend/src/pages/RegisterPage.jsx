import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, CheckCircle2, Loader, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const getStrength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.23, 1, 0.320, 1] } }
};

const inputVariants = {
  focus: { scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 20 } }
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const strength = getStrength(form.password);
  const strengthGradients = ['from-red-400 to-red-600', 'from-yellow-400 to-yellow-600', 'from-blue-400 to-blue-600', 'from-green-400 to-green-600'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Please fill in all fields'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      toast.success('Account created! Welcome to Janta Voice');
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] w-full py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="glass-card w-full max-w-md p-8 sm:p-10"
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.img
            src="/logo.jpeg"
            alt="Janta Voice Logo"
            className="w-16 h-auto mx-auto mb-4 object-contain"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Create Account</h1>
          <p className="text-muted-foreground text-sm font-medium">Join Janta Voice — file and track civic complaints</p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
            <motion.div
              className="relative"
              variants={inputVariants}
              whileFocus="focus"
            >
              <User size={18} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                type="text"
                placeholder="Rahul Kumar"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </motion.div>
          </motion.div>

          {/* Email Field */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
            <motion.div
              className="relative"
              variants={inputVariants}
              whileFocus="focus"
            >
              <Mail size={18} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                type="email"
                placeholder="rahul@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </motion.div>
          </motion.div>

          {/* Password Field */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
            <motion.div
              className="relative"
              variants={inputVariants}
              whileFocus="focus"
            >
              <Lock size={18} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              />
            </motion.div>
            {form.password && (
              <motion.div
                className="mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex gap-1 mb-2">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className={`flex-1 h-1 rounded-full ${i < strength ? `bg-gradient-to-r ${strengthGradients[strength - 1]}` : 'bg-slate-200'}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.05 }}
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold text-muted-foreground">{strengthLabels[strength - 1] || 'Too short'} password</p>
              </motion.div>
            )}
          </motion.div>

          {/* Confirm Password Field */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-semibold text-foreground mb-2">Confirm Password</label>
            <motion.div
              className="relative"
              variants={inputVariants}
              whileFocus="focus"
            >
              <Lock size={18} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-10 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                type="password"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              />
              {form.confirm && form.password === form.confirm && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3.5">
                  <CheckCircle2 size={18} className="text-green-500" />
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-6 btn btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                  <Loader size={18} />
                </motion.div>
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:opacity-80 transition-opacity">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
