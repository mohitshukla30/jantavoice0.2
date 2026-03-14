import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, ToggleRight, ToggleLeft, History, CheckCircle2, XCircle, Loader } from 'lucide-react';
import { automationAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AutomationAdminPage() {
    const [rules, setRules] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [rulesRes, logsRes] = await Promise.all([
                automationAPI.getRules(),
                automationAPI.getLogs()
            ]);
            setRules(rulesRes.data.rules);
            setLogs(rulesRes.data.logs);
        } catch (err) {
            toast.error('Failed to load automation data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (ruleId) => {
        try {
            await automationAPI.toggleRule(ruleId);
            toast.success('Rule status updated');
            fetchData();
        } catch (err) {
            toast.error('Failed to toggle rule');
        }
    };

    const handleRunNow = async () => {
        setRunning(true);
        toast.loading('Starting engine execution...', { id: 'run' });
        try {
            const { data } = await automationAPI.runNow();
            toast.success(data.message || 'Execution completed', { id: 'run' });
            fetchData();
        } catch (err) {
            toast.error('Manual execution failed', { id: 'run' });
        } finally {
            setRunning(false);
        }
    };

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader className="animate-spin text-primary w-8 h-8" /></div>;
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 px-4 sm:px-0 py-4 md:py-8">
            <div className="glass-card p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-border">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Bot className="text-primary w-8 h-8" />
                        Automation Engine
                    </h1>
                    <p className="text-muted-foreground font-medium mt-2">Manage background jobs, AI triggers, and view automated tracking logs.</p>
                </div>
                <button
                    onClick={handleRunNow}
                    disabled={running}
                    className={`btn px-6 py-3 font-bold flex items-center gap-2 transition-all ${running ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'btn-primary'}`}
                >
                    {running ? <Loader className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                    Deploy Engine Now
                </button>
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rules.map(rule => (
                    <div key={rule._id} className="glass-card rounded-2xl p-6 relative overflow-hidden border border-border group transition-all hover:bg-secondary/20">
                        {/* Active Indicator Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-secondary-foreground/20'}`}></div>

                        <div className="flex justify-between items-start mb-3 pl-2">
                            <h3 className="font-bold text-foreground text-sm">{rule.name}</h3>
                            <button
                                onClick={() => handleToggle(rule._id)}
                                className={`transition-colors ${rule.isActive ? 'text-green-500' : 'text-muted-foreground'}`}
                            >
                                {rule.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6 pl-2 min-h-[40px] leading-relaxed">{rule.description}</p>

                        <div className="pl-2 pt-4 border-t border-border flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-mono">ID: {rule.id}</span>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">Runs: {rule.runCount}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Execution Logs */}
            <div className="glass-card rounded-3xl border border-border overflow-hidden mt-12 shadow-sm">
                <div className="p-6 border-b border-border bg-secondary/10 flex items-center gap-3">
                    <History className="text-primary w-5 h-5" />
                    <h2 className="text-lg font-bold text-foreground">Recent Executions (Last 50)</h2>
                </div>

                {logs.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-sm font-medium">
                        <p>No actions have been executed by the engine yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/30">
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Time</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Rule Initiator</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Target Complaint</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Engine Action</th>
                                    <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map(log => (
                                    <tr key={log._id} className="hover:bg-secondary/20 transition-colors">
                                        <td className="p-4 text-xs text-muted-foreground font-medium whitespace-nowrap">
                                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-foreground">{log.ruleName}</td>
                                        <td className="p-4 text-sm text-muted-foreground truncate max-w-xs">{log.complaintTitle || 'Unknown / Deleted'}</td>
                                        <td className="p-4">
                                            <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold">
                                                {log.action}
                                            </span>
                                            <p className="text-xs text-muted-foreground font-medium mt-2">{log.result}</p>
                                        </td>
                                        <td className="p-4">
                                            {log.success ? (
                                                <CheckCircle2 className="text-green-500 w-5 h-5" title="Success" />
                                            ) : (
                                                <XCircle className="text-destructive w-5 h-5" title="Failed" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
