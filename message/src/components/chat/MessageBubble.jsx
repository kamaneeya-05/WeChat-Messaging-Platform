import { Check, CheckCheck, FileText } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAppSelector } from '../../store/hooks'; 
import { toMediaUrl } from '../../config/api';

export default function MessageBubble({ message, showAvatar, showName, isGroupChat }) {
  // 1. Grab current user
  const currentUser = useAppSelector((state) => state.auth.user);

  // 2. THE BULLETPROOF ID CHECK
  const rawSenderId = message.senderId?._id || message.senderId?.id || message.senderId;
  const rawMyId = currentUser?._id || currentUser?.id;

  const safeSenderId = String(rawSenderId);
  const safeMyId = String(rawMyId);

  const isMe = safeSenderId === safeMyId;

  const content = message.content || ''; 
  const senderUsername = message.senderId?.username || (isMe ? currentUser?.username : 'Unknown User'); 
  const senderProfilePicture = message.senderId?.profilePicture || null;
  const status = message.status || 'delivered'; 
  const mediaUrl = toMediaUrl(message.mediaUrl);
  
  const timestamp = new Date(message.timestamp || message.createdAt || Date.now());
  const timeString = timestamp.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex items-end gap-2 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-8 flex-shrink-0">
        {!isMe && showAvatar && (
          <Avatar username={senderUsername} src={senderProfilePicture || undefined} size="sm" />
        )}
      </div>

      <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && isGroupChat && showName && (
          <span className="text-xs font-semibold text-slate-500 mb-1 ml-1">{senderUsername}</span>
        )}

        <div className="relative group">
          <div
            className={`px-4 py-2.5 rounded-3xl text-sm leading-relaxed flex flex-col gap-2 shadow-sm ${
              isMe
                ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white rounded-br-md shadow-emerald-200'
                : 'bg-white text-slate-800 rounded-bl-md border border-white'
            }`}
          >
            {/* --- NEW: MEDIA RENDERER --- */}
            {mediaUrl && message.mediaType === 'image' && (
              <img 
                src={mediaUrl} 
                alt="attachment" 
                className="max-w-full rounded-lg max-h-64 object-cover"
              />
            )}
            
            {mediaUrl && message.mediaType === 'video' && (
              <video 
                src={mediaUrl} 
                controls 
                className="max-w-full rounded-lg max-h-64"
              />
            )}

            {mediaUrl && message.mediaType === 'audio' && (
              <audio
                src={mediaUrl}
                controls
                className="max-w-full"
              />
            )}

            {mediaUrl && message.mediaType === 'document' && (
              <a 
                href={mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg underline ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-blue-600'}`}
              >
                <FileText size={16} /> {message.mediaName || 'Download Document'}
              </a>
            )}

            {/* Display the correct MongoDB content property (if there is text) */}
            {content && <span>{content}</span>}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map((r, i) => (
                <span
                  key={i}
                  className="text-xs bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-sm cursor-pointer hover:bg-slate-50 transition"
                >
                  {r.emoji} {r.count}
                </span>
              ))}
            </div>
          )}
        </div> {/* <--- THIS WAS THE MISSING DIV */}

        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-slate-400">{timeString}</span>
          {isMe && (
            <span className="text-slate-400">
              {status === 'read' ? (
                <CheckCheck size={13} className="text-blue-400" />
              ) : status === 'delivered' ? (
                <CheckCheck size={13} />
              ) : (
                <Check size={13} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
