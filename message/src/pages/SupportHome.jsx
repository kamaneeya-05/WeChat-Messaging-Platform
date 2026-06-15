import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Video, 
  Copy, 
  Check, 
  History, 
  ExternalLink, 
  Download, 
  ShieldAlert, 
  Clock, 
  ArrowLeft,
  Calendar,
  User,
  Plus
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export function SupportHome() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');
  const [newSession, setNewSession] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/support/sessions`);
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch support sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async () => {
    setCreateLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/support/session`);
      setNewSession(data.session);
      fetchSessions();
    } catch (err) {
      console.error('Failed to create session', err);
      alert('Error creating support session');
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (sessionToken) => {
    const inviteLink = `${window.location.origin}/support/session/${sessionToken}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(sessionToken);
    setTimeout(() => setCopiedToken(''), 3000);
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const durationMs = new Date(end) - new Date(start);
    const secs = Math.floor((durationMs / 1000) % 60);
    const mins = Math.floor((durationMs / (1000 * 60)) % 60);
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'created':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-100">Created</span>;
      case 'active':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse">Live Call</span>;
      case 'ended':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-500">Ended</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[radial-gradient(circle_at_top_left,#d8fff0_0,#f5fbff_34%,#f7f3ff_100%)] p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')} 
              className="p-2.5 rounded-2xl bg-white/70 hover:bg-emerald-50 border border-white/50 text-slate-600 hover:text-emerald-600 transition shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                <Video className="text-emerald-500" size={24} /> Support Center
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1.5">Create and manage real-time video support sessions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/support/admin')}
              className="px-4 py-2.5 rounded-2xl border border-white/50 bg-white/70 hover:bg-indigo-50 text-indigo-600 font-bold text-sm shadow-sm transition flex items-center gap-2"
            >
              <ShieldAlert size={16} /> Operations Dashboard
            </button>
            <button 
              onClick={handleCreateSession}
              disabled={createLoading}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} /> {createLoading ? 'Creating...' : 'New Call Session'}
            </button>
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active / Newly Created session details */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl shadow-slate-300/30 backdrop-blur-xl">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Video size={18} className="text-emerald-500" /> Session Manager
              </h2>
              {newSession ? (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-800">Support Invite Created!</p>
                    <p className="text-[11px] text-emerald-600 mt-1">Send this link to the customer to start the call.</p>
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Customer Invite Link</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/support/session/${newSession.token}`}
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-600 select-all"
                      />
                      <button
                        onClick={() => copyToClipboard(newSession.token)}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition shadow-sm"
                        title="Copy Link"
                      >
                        {copiedToken === newSession.token ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-2">
                    <button
                      onClick={() => navigate(`/support/session/${newSession.token}`)}
                      className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={14} /> Join Call
                    </button>
                    <button
                      onClick={() => setNewSession(null)}
                      className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm transition font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 mb-3">
                    <Video size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Active Invitation</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Click &quot;New Call Session&quot; above to invite a customer.</p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl shadow-slate-300/30 backdrop-blur-xl">
              <h2 className="text-base font-bold text-slate-800 mb-3">Role Information</h2>
              <div className="flex flex-col gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/50 border border-white/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="font-bold text-slate-700">Agent Role</p>
                    <p className="text-slate-400 mt-0.5">Can create calls, end them, and record sessions.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/50 border border-white/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <div>
                    <p className="font-bold text-slate-700">Customer Role</p>
                    <p className="text-slate-400 mt-0.5">Joins calls using invite tokens without signing up.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Session History */}
          <div className="lg:col-span-2 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl shadow-slate-300/30 backdrop-blur-xl">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History size={18} className="text-indigo-500" /> Session History
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-emerald-500 animate-spin" />
                <p className="text-xs text-slate-400 mt-3 font-semibold">Loading history...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 mb-3">
                  <History size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No Session History</h3>
                <p className="text-xs text-slate-400 mt-1">Support calls you host will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                      <th className="pb-3 pr-4">Room Token</th>
                      <th className="pb-3 px-4">Customer</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Duration</th>
                      <th className="pb-3 px-4">Date</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-600 divide-y divide-slate-50">
                    {sessions.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 pr-4 font-mono font-medium text-slate-500">
                          {s.token.substring(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {s.customerName || <span className="text-slate-400 font-normal italic">Waiting...</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(s.status)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock size={12} /> {formatDuration(s.startedAt, s.endedAt)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar size={12} /> {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.status !== 'ended' && (
                              <button
                                onClick={() => navigate(`/support/session/${s.token}`)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-600 hover:text-emerald-700 font-bold transition flex items-center gap-1"
                              >
                                Join
                              </button>
                            )}
                            {s.recordingUrl && (
                              <a
                                href={`${API_BASE_URL}${s.recordingUrl}`}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 hover:text-indigo-700 font-bold transition flex items-center gap-1"
                              >
                                <Download size={12} /> Download
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
