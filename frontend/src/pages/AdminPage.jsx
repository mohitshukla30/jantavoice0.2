import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Landmark, PhoneCall, RefreshCw, List, Bot, Lightbulb, ClipboardList, FileText, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CallTranscriptViewer from '../components/CallTranscriptViewer';
import { callAPI } from '../services/api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [callLogs, setCallLogs] = useState([]);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [callsLoading, setCallsLoading] = useState(false);

  async function fetchCallLogs() {
    setCallsLoading(true);
    try {
      const res = await callAPI.getAllLogs();
      setCallLogs(res.data.logs || []);
    } catch (e) { console.error(e); }
    setCallsLoading(false);
  }

  useEffect(() => { if (activeTab === 'calllogs') fetchCallLogs(); }, [activeTab]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 sm:px-0 py-4 md:py-8">
      <div className="glass-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Administrator Console</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage AI Automations, Portals, and Flagged Entities.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto scrollbar-none pb-2">
        {[
          { id: 'overview', icon: Settings, label: 'Overview' },
          { id: 'complaints', icon: List, label: 'All Complaints' },
          { id: 'fakereports', icon: ShieldAlert, label: 'Fake Reports' },
          { id: 'automation', icon: Bot, label: 'Automation' },
          { id: 'govtickets', icon: Landmark, label: 'Gov Tickets' },
          { id: 'calllogs', icon: PhoneCall, label: 'Call Logs' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === t.id
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="glass-card p-8 md:p-12 text-center rounded-3xl border border-border mt-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Systems Online</h2>
          <p className="text-muted-foreground text-sm font-medium">Node-cron services are actively monitoring gov schemas.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8 text-left">
            <div className="p-6 bg-secondary/30 rounded-2xl border border-border">
              <div className="text-3xl font-bold text-primary">98.2%</div>
              <div className="text-xs font-bold text-muted-foreground uppercase mt-2 tracking-wider">AI Accuracy</div>
            </div>
            <div className="p-6 bg-secondary/30 rounded-2xl border border-border">
              <div className="text-3xl font-bold text-green-500">4,120</div>
              <div className="text-xs font-bold text-muted-foreground uppercase mt-2 tracking-wider">Total Actions</div>
            </div>
            <div className="p-6 bg-secondary/30 rounded-2xl border border-border">
              <div className="text-3xl font-bold text-blue-500">76</div>
              <div className="text-xs font-bold text-muted-foreground uppercase mt-2 tracking-wider">Gov Tickets</div>
            </div>
            <div className="p-6 bg-secondary/30 rounded-2xl border border-border">
              <div className="text-3xl font-bold text-destructive">14</div>
              <div className="text-xs font-bold text-muted-foreground uppercase mt-2 tracking-wider">Spam Blocked</div>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overview' && activeTab !== 'calllogs' && (
        <div className="glass-card p-12 text-center rounded-3xl border border-border flex flex-col items-center justify-center mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full mb-4 text-sm font-bold text-muted-foreground">
            <RefreshCw size={16} className="animate-spin text-primary" /> Fetching live data stream...
          </div>
          <p className="text-muted-foreground text-sm font-medium max-w-md">Admin tabular views auto-populate from database bindings on active traffic.</p>
        </div>
      )}

      {activeTab === 'calllogs' && (
        <div className="glass-card p-6 md:p-12 text-center rounded-3xl border border-border mt-8">
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-left">
            {[
              { label: 'Total Calls', value: callLogs.length, color: 'text-foreground' },
              { label: 'Completed', value: callLogs.filter(c => c.status === 'Completed').length, color: 'text-green-500' },
              { label: 'Transcribed', value: callLogs.filter(c => c.status === 'Transcribed').length, color: 'text-blue-500' },
              { label: 'Failed/No Answer', value: callLogs.filter(c => ['Failed', 'No Answer'].includes(c.status)).length, color: 'text-destructive' }
            ].map((s, i) => (
              <div key={s.label} className="bg-secondary/30 rounded-2xl p-5 border border-border">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs font-bold text-muted-foreground mt-2 tracking-wider uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Note about Twilio */}
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-8 text-sm text-left text-muted-foreground leading-relaxed">
            <div className="font-bold text-primary mb-2 flex items-center gap-2"><Lightbulb size={16} /> Twilio Integration</div>
            Get free trial at <a href="https://twilio.com" target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 font-bold transition-colors">twilio.com</a> ($15 credit).
            Add keys to <code className="bg-secondary px-1.5 py-0.5 rounded text-blue-400 text-xs mx-1">.env</code> to enable real calls.
            Without Twilio, scripts are generated but calls are simulated.
          </div>

          {/* Call logs table */}
          <div className="bg-background rounded-2xl border border-border overflow-hidden text-left shadow-sm">
            <div className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <div className="font-bold text-foreground flex items-center gap-2"><PhoneCall className="w-5 h-5 text-primary" /> All AI Calls</div>
              <button onClick={fetchCallLogs} className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-2">
                <RefreshCw size={14} className={callsLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30">
                    {['Complaint', 'Department', 'Status', 'Duration', 'Date', 'Actions'].map(h => (
                      <th key={h} className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {callsLoading && <tr><td colSpan="6" className="p-12 text-center text-muted-foreground"><RefreshCw className="animate-spin inline-block w-6 h-6 text-primary" /></td></tr>}
                  {!callsLoading && callLogs.map(log => {
                    const statusClass = log.status === 'Completed' ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : log.status === 'Transcribed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        : ['Failed', 'No Answer'].includes(log.status) ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : log.status === 'In Progress' ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-secondary text-muted-foreground border-border';
                    return (
                      <tr key={log._id} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-4 text-sm font-bold text-foreground max-w-[200px] truncate">{log.complaint?.title || 'N/A'}</td>
                        <td className="p-4 text-sm text-muted-foreground">{log.targetDepartment}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wider uppercase ${statusClass}`}>{log.status}</span>
                        </td>
                        <td className="p-4 text-sm font-medium text-muted-foreground">{log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : '—'}</td>
                        <td className="p-4 text-xs font-medium text-muted-foreground">{new Date(log.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={() => setSelectedCallId(log._id)} className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                              <ClipboardList size={14} /> Transcript
                            </button>
                            {log.script && (
                              <button onClick={() => {
                                const m = document.createElement('div');
                                m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
                                m.innerHTML = `<div class="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"><div class="p-6 border-b border-border font-bold text-foreground flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg> AI Call Script</div><div class="p-6 overflow-y-auto overflow-x-hidden flex-1"><pre class="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">${log.script.replace(/</g, '&lt;')}</pre></div><div class="p-4 border-t border-border bg-secondary/30 text-right"><button onclick="this.closest('[style*=fixed]').remove()" class="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm">Close</button></div></div>`;
                                document.body.appendChild(m);
                              }} className="btn border border-primary/20 text-primary hover:bg-primary/10 text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-xl transition-all">
                                <FileText size={14} /> Script
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!callsLoading && callLogs.length === 0 && (
                    <tr><td colSpan="6" className="p-12 text-center text-sm font-medium text-muted-foreground">No calls yet. Use "Call Department via AI" on any complaint.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transcript viewer modal */}
          {selectedCallId && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left" onClick={e => e.target === e.currentTarget && setSelectedCallId(null)}>
              <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-border bg-secondary/10">
                  <div className="font-bold text-lg text-foreground flex items-center gap-2"><PhoneCall className="w-5 h-5 text-primary" /> Call Transcript</div>
                  <button onClick={() => setSelectedCallId(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <CallTranscriptViewer callLogId={selectedCallId} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
