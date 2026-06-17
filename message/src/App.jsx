import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { useAppSelector } from './store/hooks';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProfileSettings } from './pages/ProfileSettings';
import { SupportHome } from './pages/SupportHome';
import { SupportCallRoom } from './pages/SupportCallRoom';
import { AdminDashboard } from './pages/AdminDashboard';

import { useChat } from './hooks/useChat';
import { useCall } from './hooks/useCall';
import { groupMembers } from './data/mockData';
import Sidebar from './components/sidebar/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import EmptyState from './components/common/EmptyState';
import IncomingCallModal from './components/call/IncomingCallModal';
import VoiceCallModal from './components/call/VoiceCallModal';
import VideoCallModal from './components/call/VideoCallModal';

const ChatDashboard = () => {
  const { conversations, activeConversation, activeMessages, selectConversation, sendMessage, socket } = useChat();
  const {
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    startScreenShare,
    callState,
  } = useCall(socket);

  const realCurrentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = String(realCurrentUser?._id || realCurrentUser?.id || '');

  const activeMembers = activeConversation?.type === 'group'
    ? groupMembers[activeConversation._id]
    : undefined;

  const getCallPeer = () => {
    if (callState.receiver && String(callState.receiver._id || callState.receiver.id) !== currentUserId) {
      return callState.receiver;
    }
    if (callState.caller && String(callState.caller._id || callState.caller.id) !== currentUserId) {
      return callState.caller;
    }
    return null;
  };

  const handleEndCall = () => {
    endCall({ toUser: getCallPeer(), callId: callState.callId });
  };

  if (!realCurrentUser) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#d8fff0_0,#f5fbff_34%,#f7f3ff_100%)] p-3">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?._id ?? null}
        onSelect={selectConversation}
        currentUser={realCurrentUser}
      />

      <main className="flex-1 flex overflow-hidden rounded-r-3xl border border-white/70 bg-white/75 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            messages={activeMessages}
            members={activeMembers}
            onSendMessage={sendMessage}
            onVoiceCall={(targetUser) => startCall({ targetUser, callType: 'voice' })}
            onVideoCall={(targetUser) => startCall({ targetUser, callType: 'video' })}
          />
        ) : (
          <EmptyState />
        )}
      </main>

      {/* Global call UI — works even when no chat is open */}
      <IncomingCallModal onAccept={acceptCall} onReject={rejectCall} />
      {callState.callType === 'video' ? (
        <VideoCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={handleEndCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onShareScreen={startScreenShare}
        />
      ) : (
        <VoiceCallModal
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={handleEndCall}
          onToggleMute={toggleMute}
        />
      )}
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/support/session/:token" element={<SupportCallRoom />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SupportHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/support/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
