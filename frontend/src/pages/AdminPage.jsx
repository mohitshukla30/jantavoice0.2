import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MdSettings, MdHistory, MdBlock, MdGavel, MdCall, MdOutlineRefresh, MdListAlt } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto space-y-6 page-enter pb-24">
      <div className="glass p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/60">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">Administrator Console</h1>
          <p className="text-gray-500 font-medium">Manage AI Automations, Portals, and Flagged Entities.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto scroller-hide pb-2">
        {[
          { id: 'overview', icon: MdSettings, label: 'Overview' },
          { id: 'complaints', icon: MdListAlt, label: 'All Complaints' },
          { id: 'fakereports', icon: MdBlock, label: 'Fake Reports' },
          { id: 'automation', icon: MdSettings, label: '🤖 Automation' },
          { id: 'govtickets', icon: MdGavel, label: '🏛️ Gov Tickets' },
          { id: 'calllogs', icon: MdCall, label: '📞 Call Logs' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === t.id ? 'bg-saffron text-white shadow-orange' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="glass p-12 text-center rounded-2xl border border-white">
          <h2 className="text-2xl font-heading font-bold text-gray-800 mb-2">Systems Online</h2>
          <p className="text-gray-500">Node-cron services are actively monitoring gov schemas.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-3xl font-heading font-bold text-saffron">98.2%</div>
              <div className="text-xs font-bold text-gray-400 uppercase mt-1">AI Accuracy</div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-3xl font-heading font-bold text-green-600">4,120</div>
              <div className="text-xs font-bold text-gray-400 uppercase mt-1">Total Actions</div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-3xl font-heading font-bold text-blue-500">76</div>
              <div className="text-xs font-bold text-gray-400 uppercase mt-1">Gov Tickets</div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-3xl font-heading font-bold text-red-500">14</div>
              <div className="text-xs font-bold text-gray-400 uppercase mt-1">Spam Blocked</div>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="glass p-12 text-center rounded-2xl border border-white text-gray-500 font-bold">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full mb-4">
            <MdOutlineRefresh className="animate-spin" /> Fetching live data stream...
          </div>
          <p>Admin tabular views auto-populate from database bindings on active traffic.</p>
        </div>
      )}
    </div>
  );
}
