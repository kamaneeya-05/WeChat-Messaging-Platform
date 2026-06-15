import React, { useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useChat } from '../../hooks/useChat'; // Adjust path if needed

export const StartChatForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { startDirectMessage } = useChat();

  const handleStartChat = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const result = await startDirectMessage(email);

    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      // Success! Clear the form (the UI will auto-navigate to the new chat)
      setEmail('');
    }
    
    setLoading(false);
  };

  return (
    <div className="mx-3 mb-2 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-3 shadow-sm">
      <form onSubmit={handleStartChat} className="flex flex-col gap-2">
        <label className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
          Start a new conversation
        </label>
        <div className="flex gap-2">
          <input
            id="start-chat-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Search by user email..."
            className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-800 bg-white border border-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="px-3 py-2 text-sm font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-200"
            title="Start chat"
          >
            {loading ? '...' : <SendHorizontal size={16} />}
          </button>
        </div>
        {message.text && (
          <p className={`text-xs mt-1 ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
};
