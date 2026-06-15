import React, { useState } from 'react'; // Added React import for FormEvent
import { useNavigate, Link } from 'react-router-dom'; // Added Link import
import axios from 'axios';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/features/authSlice';
import { API_BASE_URL } from '../config/api';
import { MessageCircle, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // <-- Added this missing state variable
  
  // Use the typed dispatch hook
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors when trying again

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email, password,
      });
      
      // Dispatch the action to update Redux state
      dispatch(setCredentials({ 
        user: response.data.user, 
        token: response.data.token 
      }));
      
      // Set Axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      navigate('/');
    } catch (err) {
      // Actually set the error state so the UI updates
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#d8fff0_0,#f6fbff_42%,#f7f3ff_100%)] p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-2xl shadow-slate-300/50 backdrop-blur-xl md:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-gradient-to-br from-emerald-500 via-cyan-500 to-indigo-500 p-10 text-white md:flex md:flex-col md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <MessageCircle size={24} />
            </div>
            <div>
              <p className="text-lg font-black leading-none">WeChat</p>
              <p className="text-sm text-white/75">Fast, friendly conversations</p>
            </div>
          </div>
          <div>
            <div className="mb-6 max-w-sm rounded-3xl rounded-bl-md bg-white/18 p-5 shadow-xl backdrop-blur">
              <p className="text-2xl font-black leading-tight">Catch up without the clutter.</p>
              <p className="mt-3 text-sm leading-relaxed text-white/80">Messages, media, calls, and profile controls wrapped in a calmer interface.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck size={17} />
              Secure session-based access
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center md:text-left">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-200 md:mx-0">
              <MessageCircle size={24} />
            </div>
            <h2 className="text-3xl font-black text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in to continue your conversations.</p>
          </div>
        
        {/* Now this will work properly */}
        {error && <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              required 
            />
          </div>
          <button 
            type="submit" 
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-black text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-600 hover:to-cyan-600"
          >
            Sign In
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account? <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-700">Register here</Link>
        </p>
        </div>
      </div>
    </div>
  );
};
