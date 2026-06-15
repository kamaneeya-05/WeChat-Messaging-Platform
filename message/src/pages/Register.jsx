import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { UserPlus } from 'lucide-react';

export const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Hit the Express backend register route
      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username,
        email,
        password,
      });
      
      // Registration successful! Redirect them to login
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#d8fff0_0,#f6fbff_42%,#f7f3ff_100%)] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl shadow-slate-300/50 backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-200">
            <UserPlus size={26} />
          </div>
          <h2 className="text-3xl font-black text-slate-900">Join WeChat</h2>
          <p className="mt-2 text-sm text-slate-500">Create your account and start chatting</p>
        </div>
        
        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}
        
        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              placeholder="johndoe123"
              required 
            />
          </div>
          
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              placeholder="john@example.com"
              required 
            />
          </div>
          
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              placeholder="********"
              minLength={6}
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-black text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald-600 transition-colors hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
