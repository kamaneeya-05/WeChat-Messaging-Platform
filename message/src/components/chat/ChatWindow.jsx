import { useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import InfoPanel from './InfoPanel';
import { useAppSelector } from '../../store/hooks';

export default function ChatWindow({ conversation, messages, members, onSendMessage, onVoiceCall, onVideoCall }) {
  const [showInfo, setShowInfo] = useState(false);

  const currentUser = useAppSelector((s) => s.auth.user);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  const targetUser = conversation?.participants?.find((p) => String(p?._id || p?.id || '') !== currentUserId);

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader
          conversation={conversation}
          onInfoToggle={() => setShowInfo(!showInfo)}
          showInfo={showInfo}
          onVoiceCall={() => onVoiceCall(targetUser)}
          onVideoCall={() => onVideoCall(targetUser)}
        />
        <MessageList
          messages={messages}
          isGroupChat={conversation.type === 'group'}
        />
        <MessageInput onSend={(text, file) => onSendMessage(text, file)} />
      </div>

      {showInfo && (
        <InfoPanel
          conversation={conversation}
          members={members}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}
