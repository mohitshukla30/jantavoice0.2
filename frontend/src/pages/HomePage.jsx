import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, ArrowRight, Activity, FileText, CheckCircle2 } from 'lucide-react';
import VoiceRecorder from '../components/VoiceRecorder';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.320, 1] } }
};

const hoverScale = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } };

export default function HomePage() {
  const navigate = useNavigate();
  const [stats] = useState({ resolved: 1420, active: 450, tracking: 89 });

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-6 pt-24 px-4 pb-12 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── BENTO BOX MOSAIC GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[160px]">

        {/* 1. HERO BLOCK (Spans 2 rows, 2 cols on Desktop, 3 on LG) */}
        <motion.div
          variants={itemVariants}
          className="md:col-span-2 lg:col-span-3 row-span-3 md:row-span-2 bg-card rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/5 border border-border group"
        >
          {/* Subtle India color flair in background */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-white to-success" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />

          <div className="relative z-10 flex items-center justify-between">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-primary text-xs font-semibold border border-border"
              whileHover={{ scale: 1.05 }}
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Official AI Grievance Portal
            </motion.div>
          </div>

          <div className="relative z-10 max-w-2xl mt-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4 tracking-tight">
              बोलिए, <span className="text-primary tracking-tight">हम सुनेंगे।</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed font-medium mb-6">
              Janta Voice translates your spoken issues directly to government departments. No complex forms. AI routes your complaint instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button onClick={() => navigate('/report')} {...hoverScale} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 font-bold shadow-lg shadow-primary/30">
                <Mic size={18} /> Speak Issue
              </motion.button>
              <motion.button onClick={() => navigate('/report')} {...hoverScale} className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 font-bold bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                <FileText size={18} /> Type Report
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* 2. LIVE FEED WIDGET (Spans 2 Rows) */}
        <motion.div variants={itemVariants} {...hoverScale} className="row-span-2 hidden md:flex cursor-pointer" onClick={() => navigate('/feed')}>
          <div className="h-full w-full bg-secondary text-secondary-foreground rounded-3xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 w-48 h-48 rounded-full bg-primary group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10 w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center">
              <Activity className="text-primary" size={24} />
            </div>
            <div className="relative z-10 mt-auto">
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Live Feed</span>
              <h3 className="text-xl font-bold mb-1">See Nearby Issues</h3>
              <p className="text-sm font-medium opacity-80">Track what's happening around you.</p>
            </div>
          </div>
        </motion.div>

        {/* 3. VOICE RECORD INLINE WIDGET (Spans 2 cols, 2 rows) */}
        <motion.div variants={itemVariants} className="row-span-2 md:col-span-2 bg-card rounded-3xl border border-border shadow-sm flex items-center justify-center overflow-hidden p-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 w-full flex flex-col items-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Fast Track Recording</p>
            <VoiceRecorder onTranscribe={(txt) => navigate('/report', { state: { text: txt } })} />
          </div>
        </motion.div>

        {/* 4. STATS (Resolved) */}
        <motion.div variants={itemVariants} className="bg-card border border-border text-foreground rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-success/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex justify-between items-start">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resolved</p>
            <CheckCircle2 size={24} className="text-success" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-3xl font-bold mb-1 tracking-tighter text-success">{stats.resolved}+</h3>
            <p className="text-xs font-bold text-muted-foreground">↑ 12% this week</p>
          </div>
        </motion.div>

        {/* 5. STATS (Escalated) */}
        <motion.div variants={itemVariants} className="bg-card border border-border text-foreground rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-destructive/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex justify-between items-start">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Escalated</p>
            <FileText size={24} className="text-destructive" />
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="text-3xl font-bold mb-1 tracking-tighter text-destructive">{stats.tracking}</h3>
            <p className="text-xs font-bold text-muted-foreground">State Portals</p>
          </div>
        </motion.div>

        {/* 6. QUICK ACTIONS: GOV TRACK */}
        <motion.div variants={itemVariants} {...hoverScale} className="bg-card rounded-3xl p-6 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group" onClick={() => navigate('/gov-tracking')}>
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <CheckCircle2 size={20} />
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-sm text-foreground mb-1">Gov Tracker</h3>
            <p className="text-xs text-muted-foreground font-medium">CPGRAMS sync</p>
          </div>
        </motion.div>

        {/* 7. QUICK ACTIONS: LETTERS */}
        <motion.div variants={itemVariants} {...hoverScale} className="bg-card rounded-3xl p-6 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group" onClick={() => navigate('/letters')}>
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ArrowRight size={20} />
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-sm text-foreground mb-1">Formal Letters</h3>
            <p className="text-xs text-muted-foreground font-medium">Auto PDF export</p>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
