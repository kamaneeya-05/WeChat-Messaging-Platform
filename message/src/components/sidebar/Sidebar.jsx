import { useEffect, useRef, useState } from 'react';
import { CreditCard as Edit, Settings, Bell, ChevronDown, LogOut, User as UserIcon, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/features/authSlice';
import { clearChatState } from '../../store/features/chatSlice';
import SearchBar from './SearchBar';
import ConversationList from './ConversationList';
import Avatar from '../common/Avatar';
import { StartChatForm } from './StartChatForm'; 
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

export default function Sidebar({ conversations, activeId, onSelect, currentUser }) {
  const [search, setSearch] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const userMenuRef = useRef(null);

  // Safely calculate unread count (assuming your new Redux Chat type supports this, or defaulting to 0)
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const handleLogout = async () => {
    try {
      if (token) {
        await axios.post(
          `${API_BASE_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout status update failed', error);
    }

    dispatch(clearChatState());
    dispatch(logout());
  };

  const focusStartChat = () => {
    const el = document.getElementById('start-chat-email-input');
    el?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showUserMenu) return;
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col h-full rounded-l-3xl border border-white/70 bg-white/80 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-200">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <h1 className="text-slate-900 font-black text-base tracking-tight leading-none">WeChat</h1>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">Stay connected</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {totalUnread > 0 && (
              <div className="relative">
                <Bell size={17} className="text-gray-500 hover:text-gray-700 cursor-pointer transition" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center font-bold leading-none" style={{ fontSize: '9px' }}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              </div>
            )}
            <button
              onClick={focusStartChat}
              className="p-2 rounded-xl bg-white/70 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition shadow-sm"
              title="New chat by email"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="p-2 rounded-xl bg-white/70 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition shadow-sm"
              title="Account settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* NEW: Start Chat Form embedded here */}
      <StartChatForm />

      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={onSelect}
        searchQuery={search}
      />

      <div className="border-t border-white/80 px-3 py-3 relative bg-white/40" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-white transition group shadow-sm hover:shadow-md"
        >
          {/* Fallback to username if name isn't available on the Redux user object */}
          <Avatar 
            username={currentUser.name || currentUser.username} 
            src={currentUser?.profilePicture || undefined}
            size="sm" 
            status={currentUser.status || 'online'} 
            showStatus 
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name || currentUser.username}</p>
            <p className="text-xs text-green-600 capitalize">{currentUser.status || 'online'}</p>
          </div>
          <ChevronDown size={14} className={`text-gray-500 group-hover:text-gray-700 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl overflow-hidden border border-slate-100 text-sm shadow-2xl shadow-slate-300/50 z-50">
            {['online', 'away', 'busy', 'offline'].map((s) => (
              <button
                key={s}
                onClick={() => setShowUserMenu(false)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 transition capitalize ${
                  (currentUser.status || 'online') === s ? 'text-gray-900 font-medium' : 'text-gray-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  s === 'online' ? 'bg-green-500' :
                  s === 'away' ? 'bg-yellow-500' :
                  s === 'busy' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                {s}
              </button>
            ))}
            
            {/* Profile Settings Link */}
            <div className="h-px bg-gray-200 w-full my-1" />
            <button
              onClick={() => {
                navigate('/profile');
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 transition text-gray-600"
            >
              <UserIcon size={14} />
              Profile Settings
            </button>

            {/* Support Center Link */}
            <button
              onClick={() => {
                navigate('/support');
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 transition text-emerald-600 hover:text-emerald-700 font-bold"
            >
              <Video size={14} />
              Support Center
            </button>
            
            {/* Added Log Out Button */}
            <div className="h-px bg-gray-200 w-full my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100 transition text-red-600 hover:text-red-700"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
