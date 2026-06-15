import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  ShieldAlert, 
  ArrowLeft, 
  RefreshCw, 
  Activity, 
  Users, 
  AlertTriangle, 
  PhoneOff, 
  History, 
  FileText, 
  X,
  Play,
  CheckCircle,
  HelpCircle,
  Database
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metricsText, setMetricsText] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Parsed metrics from Prometheus metrics
  const [metrics, setMetrics] = useState({
    activeSessions: 0,
    connectedParticipants: 0,
    errorCount: 0,
    totalSessions: 0,
    totalRecordings: 0,
    disconnectsCount: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch support sessions history
      const sessionsRes = await axios.get(`${API_BASE_URL}/api/support/sessions`);
      setSessions(sessionsRes.data);

      // 2. Fetch Prometheus metrics text
      const metricsRes = await axios.get(`${API_BASE_URL}/api/support/metrics`);
      const text = metricsRes.data;
      setMetricsText(text);
      parseMetrics(text);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const parseMetrics = (text) => {
    const lines = text.split('\n');
    const parsed = {
      activeSessions: 0,
      connectedParticipants: 0,
      errorCount: 0,
      totalSessions: 0,
      totalRecordings: 0,
      disconnectsCount: 0
    };

    lines.forEach(line => {
      if (line.startsWith('#') || !line.trim()) return;
      const parts = line.split(' ');
      if (parts.length < 2) return;
      const name = parts[0];
      const val = parseInt(parts[1], 10) || 0;

      if (name === 'support_active_sessions') parsed.activeSessions = val;
      if (name === 'support_connected_participants') parsed.connectedParticipants = val;
      if (name === 'support_session_errors_total') parsed.errorCount = val;
      if (name === 'support_total_sessions_created') parsed.totalSessions = val;
      if (name === 'support_total_recordings_saved') parsed.totalRecordings = val;
      if (name === 'support_disconnects_total') parsed.disconnectsCount = val;
    });

    setMetrics(parsed);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleEndSession = async (sessionId) => {
    if (window.confirm('Force terminate this live session? All active connections will be cut immediately.')) {
      try {
        await axios.post(`${API_BASE_URL}/api/support/session/${sessionId}/end`);
        // Notify socket server to disconnect participants
        const socket = io(API_BASE_URL);
        socket.emit('end-support-call', { sessionId });
        socket.disconnect();
        
        alert('Session terminated.');
        fetchData();
      } catch (err) {
        console.error('Failed to end session', err);
        alert('Error terminating session');
      }
    }
  };

  const openEventLogs = (session) => {
    setSelectedSession(session);
    setShowLogsModal(true);
  };

  const getDuration = (s) => {
    if (!s.startedAt) return '0s';
    const end = s.endedAt ? new Date(s.endedAt) : new Date();
    const durationMs = end - new Date(s.startedAt);
    const secs = Math.floor((durationMs / 1000) % 60);
    const mins = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);
    
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const activeCalls = sessions.filter(s => s.status === 'active');
  const pastCalls = sessions.filter(s => s.status !== 'active');

  return (
    <div className="min-h-screen w-screen bg-[radial-gradient(circle_at_top_left,#f8fafc_0,#f1f5f9_40%,#e2e8f0_100%)] p-6 overflow-y-auto text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/support')} 
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 transition shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                <ShieldAlert className="text-indigo-600" size={24} /> Support Operations Dashboard
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1.5">Real-time session control, activity audit log, and telemetry metrics</p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 transition shadow-sm disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {/* Card 1 */}
          <div className="rounded-3xl border border-white bg-white/70 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity size={20} className="animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Support Calls</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.activeSessions}</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="rounded-3xl border border-white bg-white/70 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connected Callers</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.connectedParticipants}</p>
            </div>
          </div>
          {/* Card 3 */}
          <div className="rounded-3xl border border-white bg-white/70 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Drops / Errors</p>
              <p className="text-2xl font-black text-red-600 mt-0.5">
                {metrics.errorCount + metrics.disconnectsCount}
              </p>
            </div>
          </div>
          {/* Card 4 */}
          <div className="rounded-3xl border border-white bg-white/70 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-md flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Calls Created</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.totalSessions}</p>
            </div>
          </div>
        </div>

        {/* Live Calls */}
        <section className="rounded-3xl border border-white bg-white/70 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md mb-8">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Play size={18} className="text-emerald-500" /> Live Call Registry
          </h2>
          {activeCalls.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              No support calls are currently active.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    <th className="pb-3 pr-4">Session Token</th>
                    <th className="pb-3 px-4">Support Agent</th>
                    <th className="pb-3 px-4">Customer Guest</th>
                    <th className="pb-3 px-4">Duration</th>
                    <th className="pb-3 pl-4 text-right">Emergency Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50">
                  {activeCalls.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 pr-4 font-mono text-slate-500 font-bold">{s.token.substring(0, 12)}...</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{s.agentId?.username || 'Agent'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{s.customerName || 'Connecting...'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600 animate-pulse">{getDuration(s)}</td>
                      <td className="py-3 pl-4 text-right">
                        <button
                          onClick={() => handleEndSession(s._id)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 hover:text-red-700 font-bold transition flex items-center gap-1.5 ml-auto"
                        >
                          <PhoneOff size={12} /> Force End
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* History Audit Log */}
        <section className="rounded-3xl border border-white bg-white/70 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md mb-8">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <History size={18} className="text-indigo-500" /> Historical Session Registry & Audit Logs
          </h2>
          {pastCalls.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              No historical sessions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    <th className="pb-3 pr-4">Session Token</th>
                    <th className="pb-3 px-4">Support Agent</th>
                    <th className="pb-3 px-4">Customer Guest</th>
                    <th className="pb-3 px-4">Call Started At</th>
                    <th className="pb-3 px-4">Total Duration</th>
                    <th className="pb-3 pl-4 text-right">Operations Audit</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-50">
                  {pastCalls.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 pr-4 font-mono text-slate-500">{s.token.substring(0, 12)}...</td>
                      <td className="py-3 px-4 text-slate-600">{s.agentId?.username || 'Agent'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.customerName || 'None'}</td>
                      <td className="py-3 px-4 text-slate-400">{s.startedAt ? new Date(s.startedAt).toLocaleString() : '-'}</td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{getDuration(s)}</td>
                      <td className="py-3 pl-4 text-right">
                        <button
                          onClick={() => openEventLogs(s)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-semibold transition flex items-center gap-1.5 ml-auto text-xs"
                        >
                          <FileText size={12} /> Audit Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Telemetry output */}
        <section className="rounded-3xl border border-white bg-slate-900 p-5 shadow-xl text-white">
          <h2 className="text-sm font-bold font-mono text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle size={16} /> Raw Prometheus Telemetry Endpoint Content (/api/support/metrics)
          </h2>
          <pre className="p-4 rounded-2xl bg-slate-950 font-mono text-[10px] text-slate-300 leading-normal max-h-56 overflow-y-auto whitespace-pre-wrap">
            {metricsText}
          </pre>
        </section>

      </div>

      {/* Audit Logs Modal */}
      {showLogsModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full rounded-3xl bg-white border border-slate-100 p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
            <button
              onClick={() => setShowLogsModal(false)}
              className="absolute top-4 right-4 p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">Session Event Audit Log</h3>
            <p className="text-[10px] font-mono text-slate-400">ID: {selectedSession._id}</p>

            <div className="flex-1 min-h-0 overflow-y-auto mt-5 pr-2 space-y-4">
              {(!selectedSession.history || selectedSession.history.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-6">No event logs recorded for this session.</p>
              ) : (
                <div className="relative border-l border-slate-200 ml-2.5 pl-4 space-y-4 text-xs">
                  {selectedSession.history.map((log, index) => (
                    <div key={log._id || index} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21.5px] top-0.5 w-3 h-3 rounded-full bg-indigo-500 border border-white" />
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700 capitalize">{log.userName || 'System'}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.event}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
