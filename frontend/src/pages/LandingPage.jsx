import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, CheckCircle2, Zap, Mic, FileText, MapPin, FileDown, Activity, Server, Flag } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 15, mass: 1 } }
};

const hoverScale = { whileHover: { scale: 1.04 }, whileTap: { scale: 0.95 } };

export default function LandingPage() {
  return (
    <motion.div
      className="w-full max-w-7xl mx-auto space-y-6 pt-24 px-4 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── BENTO BOX MOSAIC GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[160px]">

        {/* 1. HERO BLOCK (Spans 2 rows, 2 cols on Desktop, 3 on LG) */}
        <motion.div
          variants={itemVariants}
          className="md:col-span-2 lg:col-span-3 row-span-2 bg-white rounded-3xl p-8 flex flex-col justify-end relative overflow-hidden shadow-lg shadow-black/5 border border-border group"
        >
          {/* Subtle India color flair in background */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-white to-success" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />

          <div className="relative z-10 max-w-2xl mt-auto">
            <motion.div
              className="inline-flex items-center gap-2 bg-secondary text-primary border border-border rounded-full px-4 py-2 text-sm font-semibold mb-6"
              whileHover={{ scale: 1.02 }}
            >
              <Flag size={14} className="text-primary" /> India's Civic Platform
            </motion.div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4 tracking-tight">
              Your Voice Matters.<br />
              <span className="text-primary tracking-tight">
                Real Issues. Real Change.
              </span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed font-medium">
              File civic complaints, track them in real-time on official government portals, and let AI automatically escalate and manage your tickets.
            </p>
          </div>
        </motion.div>

        {/* 2. VOICE REPORT BLOCK (Action Widget) */}
        <motion.div variants={itemVariants} {...hoverScale}>
          <Link to="/report?tab=voice" className="h-full bg-primary text-primary-foreground rounded-3xl p-6 flex flex-col justify-between shadow-lg shadow-primary/20 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-20 w-32 h-32 rounded-full bg-white group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Mic size={24} />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-1">Voice Report</h3>
              <p className="text-sm font-medium opacity-90">Speak in Hindi or English</p>
            </div>
          </Link>
        </motion.div>

        {/* 3. QUICK STAT 1 */}
        <motion.div variants={itemVariants} className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Reports</p>
            <TrailingIcon Icon={TrendingUp} color="text-primary" bg="bg-primary/10" />
          </div>
          <div>
            <h3 className="text-4xl font-bold text-foreground mb-1 tracking-tighter">42.8<span className="text-xl text-muted-foreground font-semibold">K</span></h3>
            <p className="text-xs font-bold text-success">+12% this week</p>
          </div>
        </motion.div>

        {/* 4. QUICK ACTIONS WIDGET (Spans 2 cols) */}
        <motion.div variants={itemVariants} className="md:col-span-2 bg-card rounded-3xl p-6 border border-border shadow-sm flex gap-4">
          <Link to="/report" className="flex-1 bg-secondary/50 hover:bg-secondary rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
            <FileText className="text-primary mb-2" size={24} />
            <span className="font-bold text-sm text-foreground">Type Report</span>
          </Link>
          <Link to="/gov-tracking" className="flex-1 bg-secondary/50 hover:bg-secondary rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
            <MapPin className="text-primary mb-2" size={24} />
            <span className="font-bold text-sm text-foreground">Gov Track</span>
          </Link>
          <Link to="/my-complaints?tab=letters" className="flex-1 bg-secondary/50 hover:bg-secondary rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-colors">
            <FileDown className="text-primary mb-2" size={24} />
            <span className="font-bold text-sm text-foreground">PDF Letters</span>
          </Link>
        </motion.div>

        {/* 5. QUICK STAT 2 (Resolved) */}
        <motion.div variants={itemVariants} className="bg-success text-success-foreground rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-bl-[100px] group-hover:scale-110 transition-transform origin-top-right duration-500" />
          <div className="relative z-10 flex justify-between items-start">
            <p className="text-xs font-bold opacity-90 uppercase tracking-wider">Resolved Tickets</p>
            <CheckCircle2 size={24} />
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-bold mb-1 tracking-tighter">33.2<span className="text-xl font-semibold opacity-80">K</span></h3>
            <p className="text-xs font-bold opacity-90">+18% this month</p>
          </div>
        </motion.div>

        {/* 6. AUTOMATION LOG WIDGET (Spans 2 rows, 2 cols) */}
        <motion.div variants={itemVariants} className="md:col-span-2 row-span-2 bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <Activity size={18} />
              </div>
              Automation Activity
            </h2>
            <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
            </span>
          </div>
          <div className="space-y-4 flex-1 overflow-hidden">
            {[
              { msg: 'Auto-escalated pothole report in Pune.', time: '2 mins ago' },
              { msg: 'Submitted water shortage to CPGRAMS.', time: '15 mins ago' },
              { msg: 'Generated formal PDF for Noise Complaint.', time: '45 mins ago' },
              { msg: 'AI categorized 45 new incoming reports.', time: '2 hrs ago' },
            ].map((log, i) => (
              <motion.div key={i} className="flex gap-3 items-start border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{log.msg}</p>
                  <p className="text-xs text-muted-foreground mt-1">{log.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 7. PORTAL STATUS WIDGET (Spans 2 rows, 2 cols) */}
        <motion.div variants={itemVariants} className="md:col-span-2 row-span-2 bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-secondary text-primary rounded-xl border border-border">
              <Server size={18} />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Gov Portal Status</h2>
          </div>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {[
              { name: 'CPGRAMS (Central)', status: 'Operational', up: true },
              { name: 'Aaple Sarkar (MH)', status: 'Operational', up: true },
              { name: 'BMC Portal (Mumbai)', status: 'Delayed', up: false },
              { name: 'Swachhata App', status: 'Operational', up: true },
            ].map((portal, i) => (
              <div key={i} className={`flex items-center justify-between p-3.5 rounded-2xl border ${portal.up ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
                <span className="font-semibold text-sm text-foreground">{portal.name}</span>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full ${portal.up ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {portal.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
}

// Helper component for stat icons
function TrailingIcon({ Icon, color, bg }) {
  return (
    <div className={`p-2 rounded-xl ${color} ${bg}`}>
      <Icon size={18} />
    </div>
  );
}
