import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { useAppSelector } from '../../store/hooks';

function shouldShowAvatar(messages, index) {
  if (messages[index].isMe) return false;
  const next = messages[index + 1];
  return !next || next.isMe || next.senderId !== messages[index].senderId;
}

function shouldShowName(messages, index) {
  const prev = messages[index - 1];
  return !prev || prev.senderId !== messages[index].senderId;
}

function isNewDay(messages, index) {
  if (index === 0) return true;
  const current = new Date(messages[index].timestamp || messages[index].createdAt || Date.now());
  const prev = new Date(messages[index - 1].timestamp || messages[index - 1].createdAt || Date.now());
  return current.toDateString() !== prev.toDateString();
}

export default function MessageList({ messages, isGroupChat }) {
  const bottomRef = useRef(null);
  const wallpaper = useAppSelector((state) => state.chat.wallpaper) || 'default';
  const theme = useAppSelector((state) => state.chat.theme) || 'light';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getWallpaperStyle = () => {
    switch (wallpaper) {
      case 'emerald':
        return theme === 'dark' 
          ? { backgroundColor: '#071813', backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }
          : { backgroundColor: '#efeae2', backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' };
      case 'charcoal':
        return { backgroundColor: theme === 'dark' ? '#09090b' : '#f4f4f5' };
      case 'doodle':
        return theme === 'dark'
          ? { backgroundColor: '#0f172a', backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' }
          : { backgroundColor: '#f1f5f9', backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' };
      case 'sunset':
        return { backgroundImage: 'linear-gradient(135deg, #fef08a 0%, #fda4af 100%)' };
      case 'default':
      default:
        return theme === 'dark'
          ? { backgroundImage: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }
          : { backgroundImage: 'linear-gradient(180deg, #f8fbff 0%, #eefaf5 100%)' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 transition-all duration-300" style={getWallpaperStyle()}>
      {messages.map((message, index) => (
        <div key={message._id}>
          {isNewDay(messages, index) && (
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white" />
              <span className="text-xs text-slate-500 font-bold px-3 py-1 rounded-full bg-white/80 shadow-sm">
                {new Date(message.timestamp || message.createdAt || Date.now()).toLocaleDateString([], {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <div className="flex-1 h-px bg-white" />
            </div>
          )}
          <MessageBubble
            message={message}
            showAvatar={shouldShowAvatar(messages, index)}
            showName={shouldShowName(messages, index)}
            isGroupChat={isGroupChat}
          />
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
