import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import InfoPanel from './InfoPanel';

export default function ChatWindow({ conversation, messages, members, onSendMessage }) {
  const [showInfo, setShowInfo] = useState(false);
  const [callMode, setCallMode] = useState(null);
  const [callError, setCallError] = useState('');
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);

  const endCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setCallMode(null);
    setCallError('');
  };

  const startCall = async (mode) => {
    try {
      setCallError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
      streamRef.current = stream;
      setCallMode(mode);
    } catch {
      setCallError(
        mode === 'video'
          ? 'Camera/microphone permission is required for video call.'
          : 'Microphone permission is required for voice call.'
      );
    }
  };

  useEffect(() => {
    if (!localVideoRef.current || !streamRef.current) return;
    localVideoRef.current.srcObject = streamRef.current;
  }, [callMode]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader
          conversation={conversation}
          onInfoToggle={() => setShowInfo(!showInfo)}
          showInfo={showInfo}
          onVoiceCall={() => startCall('voice')}
          onVideoCall={() => startCall('video')}
        />
        {callError && (
          <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {callError}
          </div>
        )}
        {callMode && (
          <div className="mx-4 mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {callMode === 'video' ? <Video size={16} className="text-blue-500" /> : <Phone size={16} className="text-blue-500" />}
                <span className="text-sm font-medium text-slate-700">
                  {callMode === 'video' ? 'Video call active' : 'Voice call active'}
                </span>
              </div>
              <button
                onClick={endCall}
                className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
              >
                <PhoneOff size={14} />
                End call
              </button>
            </div>

            {callMode === 'video' ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="mt-3 h-40 w-64 rounded-lg bg-slate-900 object-cover"
              />
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Voice call is connected. Your microphone is live.
              </p>
            )}
          </div>
        )}
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
