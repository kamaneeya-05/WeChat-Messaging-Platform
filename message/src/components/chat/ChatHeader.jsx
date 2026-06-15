import { Phone, Video, Info, Users, MoreHorizontal } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAppSelector } from '../../store/hooks'; // ADDED THIS
import { useEffect, useRef, useState } from 'react';

const statusLabel = {
  online: 'Online',
  away: 'Away',
  busy: 'Do not disturb',
  offline: 'Offline',
};

export default function ChatHeader({ conversation, onInfoToggle, showInfo, onVoiceCall, onVideoCall }) {
  // 1. Grab current user
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  
  const { type, isTyping } = conversation;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatId = String(conversation?._id || '');
  const moreMenuRef = useRef(null);

  // 2. Dynamically calculate the name and status
  let displayName = 'Unknown User';
  let displayStatus = 'Offline';
  let displayProfilePicture;

  if (type === 'group') {
    displayName = conversation.chatName || 'Group Chat';
    const memberCount = conversation.participants?.length || 0;
    displayStatus = `${memberCount} members`;
  } else {
    // 1:1 Chat
    const otherUser = conversation.participants?.find((p) => String(p?._id || p?.id || '') !== currentUserId);
    const fallbackUser = conversation.participants?.[0];
    const safeUser = otherUser || fallbackUser;
    displayName = safeUser?.username || 'Unknown User';
    displayProfilePicture = safeUser?.profilePicture;
    // Use the statusLabel map safely
    displayStatus = safeUser?.status ? statusLabel[safeUser.status] : 'Offline';
  }

  useEffect(() => {
    const mutedRaw = localStorage.getItem('mutedChats');
    if (!mutedRaw || !chatId) {
      setIsMuted(false);
      return;
    }

    try {
      const mutedChats = JSON.parse(mutedRaw);
      setIsMuted(mutedChats.includes(chatId));
    } catch {
      setIsMuted(false);
    }
  }, [chatId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showMoreMenu) return;
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  const toggleMute = () => {
    if (!chatId) return;

    const mutedRaw = localStorage.getItem('mutedChats');
    let mutedChats = [];
    try {
      mutedChats = mutedRaw ? JSON.parse(mutedRaw) : [];
    } catch {
      mutedChats = [];
    }

    if (mutedChats.includes(chatId)) {
      mutedChats = mutedChats.filter((id) => id !== chatId);
      setIsMuted(false);
    } else {
      mutedChats.push(chatId);
      setIsMuted(true);
    }

    localStorage.setItem('mutedChats', JSON.stringify(mutedChats));
    setShowMoreMenu(false);
  };

  const copyChatId = async () => {
    if (!chatId) return;
    try {
      await navigator.clipboard.writeText(chatId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    } finally {
      setShowMoreMenu(false);
    }
  };

  return (
    <div className="h-16 px-5 flex items-center justify-between border-b border-white/80 bg-white/70 flex-shrink-0 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {type === 'group' ? (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-indigo-600" />
          </div>
        ) : (
          <>
           <Avatar username={displayName} src={displayProfilePicture} size="md" status={displayStatus === 'Offline' ? 'offline' : 'online'} showStatus />
           </>
         
        )}

        <div>
          {/* 4. Display the calculated name */}
          <h2 className="font-bold text-slate-900 text-sm leading-tight">{displayName}</h2>
          {isTyping ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <span>typing</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {displayStatus}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 relative" ref={moreMenuRef}>
        <button onClick={onVoiceCall} className="p-2 rounded-xl hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition" title="Voice call">
          <Phone size={17} />
        </button>
        <button onClick={onVideoCall} className="p-2 rounded-xl hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition" title="Video call">
          <Video size={17} />
        </button>
        <button
          onClick={onInfoToggle}
          className={`p-2 rounded-xl transition ${showInfo ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-50 text-slate-500 hover:text-emerald-600'}`}
          title="Conversation info"
        >
          <Info size={17} />
        </button>
        <button
          onClick={() => setShowMoreMenu((prev) => !prev)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
          title="More options"
        >
          <MoreHorizontal size={17} />
        </button>
        {showMoreMenu && (
          <div className="absolute right-5 top-14 z-20 min-w-[190px] rounded-2xl border border-slate-100 bg-white p-1 shadow-2xl shadow-slate-300/50">
            <button
              onClick={toggleMute}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              {isMuted ? 'Unmute chat' : 'Mute chat'}
            </button>
            <button
              onClick={copyChatId}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Copy chat ID
            </button>
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onInfoToggle();
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              {showInfo ? 'Hide info panel' : 'Show info panel'}
            </button>
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onVoiceCall();
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Start voice call
            </button>
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onVideoCall();
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Start video call
            </button>
          </div>
        )}
        {copied && (
          <div className="absolute right-5 top-2 rounded bg-slate-800 px-2 py-1 text-xs text-white">
            Chat ID copied
          </div>
        )}
      </div>
    </div>
  );
}
