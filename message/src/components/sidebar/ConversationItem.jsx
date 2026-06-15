import { Users } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAppSelector } from '../../store/hooks'; // <-- Add this import

export default function ConversationItem({ conversation, isActive, onClick }) {
  // Grab the logged in user
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');

  // We DO NOT destructure 'username' or 'status' here anymore, because they don't exist on the root chat object!
  const { type, lastMessage, lastMessageTime, unreadCount, memberCount, isTyping } = conversation;
  const formattedLastMessageTime = lastMessageTime
    ? new Date(lastMessageTime).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // --- DYNAMICALLY CALCULATE NAME & STATUS ---
  let displayName = 'Unknown User';
  let displayStatus = 'offline';
  let displayProfilePicture;

  if (type === 'group') {
    displayName = conversation.chatName || 'Group Chat';
  } else {
    // 1:1 Chat: Find the person who is NOT the current user
    const otherUser = conversation.participants?.find((p) => String(p?._id || p?.id || '') !== currentUserId);
    const safeUser = otherUser || conversation.participants?.[0];
    displayName = safeUser?.username || 'Unknown User';
    displayStatus = safeUser?.status || 'offline';
    displayProfilePicture = safeUser?.profilePicture;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group text-left ${
        isActive
          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-200'
          : 'hover:bg-white hover:shadow-md'
      }`}
    >
      <div className="relative flex-shrink-0">
        {type === 'group' ? (
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-indigo-50'}`}>
            <Users size={18} className={isActive ? 'text-white' : 'text-indigo-500'} />
          </div>
        ) : (
          <Avatar
            username={displayName} // Pass the calculated name here!
            src={displayProfilePicture}
            size="md"
            status={displayStatus} // Pass the calculated status here!
            showStatus
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
            {displayName /* Display the calculated name here! */}
          </span>
          <span className={`text-xs flex-shrink-0 ml-1 ${isActive ? 'text-emerald-50' : 'text-slate-400'}`}>
            {formattedLastMessageTime}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {isTyping ? (
            <div className={`flex items-center gap-1 text-xs ${isActive ? 'text-emerald-50' : 'text-emerald-500'}`}>
              <span>typing</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          ) : (
            <p className={`text-xs truncate ${isActive ? 'text-emerald-50' : 'text-slate-500'}`}>
              {/* If lastMessage is an object from MongoDB, you might need to do lastMessage?.content */}
              {lastMessage || "Started a conversation"} 
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {type === 'group' && memberCount && (
              <span className={`text-xs ${isActive ? 'text-emerald-50' : 'text-slate-400'}`}>
                {memberCount}
              </span>
            )}
            {(unreadCount || 0) > 0 && (
              <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none ${
                isActive ? 'bg-white text-emerald-600' : 'bg-rose-500 text-white'
              }`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
