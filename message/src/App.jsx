import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 1. Import Redux hook to check authentication state
import { useAppSelector } from './store/hooks'; 

// 2. Import your Auth pages 
import { Login } from './pages/Login'; 
import { Register } from './pages/Register';
import { ProfileSettings } from './pages/ProfileSettings';
import { SupportHome } from './pages/SupportHome';
import { SupportCallRoom } from './pages/SupportCallRoom';
import { AdminDashboard } from './pages/AdminDashboard';

// 3. Your existing imports
import { useChat } from './hooks/useChat';
import { groupMembers } from './data/mockData'; // Note: mock currentUser is removed
import Sidebar from './components/sidebar/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import EmptyState from './components/common/EmptyState';

// --- THE MAIN CHAT UI (Extracted from your original App) ---
const ChatDashboard = () => {
  const { conversations, activeConversation, activeMessages, selectConversation, sendMessage, socket } = useChat();

  // Grab the REAL logged-in user from Redux!
  const realCurrentUser = useAppSelector((state) => state.auth.user);

  const activeMembers = activeConversation?.type === 'group'
    ? groupMembers[activeConversation._id] // You'll eventually replace this mock too!
    : undefined;

  // Safety check to ensure user data is loaded before rendering
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
            socket={socket}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
};

// --- ROUTE PROTECTION ---
// This component wraps our ChatDashboard. If the user isn't logged in, it boots them to /login.
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// --- MAIN APP COMPONENT ---
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/support/session/:token" element={<SupportCallRoom />} />

        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ChatDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Profile Settings Route */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } 
        />

        {/* Support Routes */}
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
