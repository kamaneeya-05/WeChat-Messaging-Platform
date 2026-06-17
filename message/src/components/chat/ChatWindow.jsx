import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import ChatHeader from './ChatHeader';
import { useCall } from '../../hooks/useCall';
import IncomingCallModal from '../call/IncomingCallModal';
import VoiceCallModal from '../call/VoiceCallModal';
import VideoCallModal from '../call/VideoCallModal';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import InfoPanel from './InfoPanel';
import { useAppSelector } from '../../store/hooks';

export default function ChatWindow({ conversation, messages, members, onSendMessage, socket }) {
  const [showInfo, setShowInfo] = useState(false);
  const [callError, setCallError] = useState('');
  const localVideoRef = useRef(null);

  const { localStream, remoteStream, startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, startScreenShare, callState } = useCall(socket);

  const currentUser = useAppSelector((s) => s.auth.user);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  const targetUser = conversation?.participants?.find((p) => String(p?._id || p?.id || '') !== currentUserId);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localStream]);

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader
          conversation={conversation}
          onInfoToggle={() => setShowInfo(!showInfo)}
          showInfo={showInfo}
          onVoiceCall={() => startCall({ targetUser, callType: 'voice' })}
          onVideoCall={() => startCall({ targetUser, callType: 'video' })}
        />
        {callError && (
          <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {callError}
          </div>
        )}
        {/* Call UI handled via modals */}
        <IncomingCallModal socket={socket} onAccept={acceptCall} onReject={rejectCall} />
        <VideoCallModal localStream={localStream} remoteStream={remoteStream} onEnd={() => endCall({ toUser: conversation.participants?.find(p => p._id !== undefined) })} onToggleMute={toggleMute} onToggleCamera={toggleCamera} onShareScreen={startScreenShare} />
        <VoiceCallModal localStream={localStream} remoteStream={remoteStream} onEnd={() => endCall({ toUser: conversation.participants?.find(p => p._id !== undefined) })} onToggleMute={toggleMute} />
        <MessageList
          messages={messages}
          isGroupChat={conversation.type === 'group'}
        />
        
        {/* 2. UPDATED: Call the prop 'onSendMessage', not 'sendMessage' */}
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
