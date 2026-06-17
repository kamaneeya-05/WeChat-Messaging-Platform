import { createSlice } from '@reduxjs/toolkit';

const savedTheme = localStorage.getItem('theme') || 'light';
const savedWallpaper = localStorage.getItem('wallpaper') || 'default';

const initialState = {
  conversations: [],
  activeConversation: null,
  activeMessages: [],
  theme: savedTheme,
  wallpaper: savedWallpaper
};

// 2. Create the Slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action) => {
      // Map MongoDB _id to id for your Sidebar component
      state.conversations = action.payload.map(chat => ({ ...chat, id: chat._id }));
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    setActiveMessages: (state, action) => {
      state.activeMessages = action.payload;
    },
    addMessage: (state, action) => {
  // 1. Check if a message with this exact MongoDB _id already exists in our state
  const messageExists = state.activeMessages.some(
    (msg) => msg._id === action.payload._id
  );

  // 2. Only push it to the array if it DOES NOT exist yet
  if (!messageExists) {
    state.activeMessages.push(action.payload);
  }
  
  // Optional: Also update the lastMessage on the conversation in the sidebar
  const conversation = state.conversations.find(c => c._id === action.payload.chatId);
  if (conversation) {
    conversation.lastMessage = action.payload.content;
    conversation.lastMessageTime = action.payload.timestamp;
    if (state.activeConversation?._id !== conversation._id) {
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    }
    // conversation.lastMessageTime = ... 
  }
},
    updateMessageAsDeleted: (state, action) => {
      const messageId = action.payload;
      const message = state.activeMessages.find(msg => msg._id === messageId);
      if (message) {
        message.isDeleted = true;
        message.content = "This message was deleted";
      }
    },
    addConversation: (state, action) => {
  // Check if it's already in the sidebar to prevent duplicates
  const exists = state.conversations.find(c => c._id === action.payload._id);
  if (!exists) {
    // Add the new chat to the top of the list and map the _id
    state.conversations.unshift({ ...action.payload, _id: action.payload._id });
  }
},
    markConversationRead: (state, action) => {
      const conversation = state.conversations.find((c) => c._id === action.payload);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
    markMyMessagesReadInChat: (state, action) => {
      const chatId = action.payload;
      state.activeMessages = state.activeMessages.map((msg) => {
        if (msg.chatId === chatId) {
          return { ...msg, status: 'read' };
        }
        return msg;
      });
    },
    updateParticipantStatus: (state, action) => {
      const { userId, status } = action.payload;
      const matchId = (p) => String(p._id || p.id) === String(userId);

      state.conversations.forEach((conv) => {
        conv.participants?.forEach((p) => {
          if (matchId(p)) p.status = status;
        });
      });

      if (state.activeConversation?.participants) {
        state.activeConversation.participants.forEach((p) => {
          if (matchId(p)) p.status = status;
        });
      }
    },
    setBulkParticipantStatus: (state, action) => {
      const { userIds, status } = action.payload;
      const idSet = new Set(userIds.map(String));

      state.conversations.forEach((conv) => {
        conv.participants?.forEach((p) => {
          if (idSet.has(String(p._id || p.id))) p.status = status;
        });
      });

      if (state.activeConversation?.participants) {
        state.activeConversation.participants.forEach((p) => {
          if (idSet.has(String(p._id || p.id))) p.status = status;
        });
      }
    },
    clearChatState: (state) => {
      state.activeConversation = null;
      state.activeMessages = [];
      state.conversations = [];
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      if (action.payload === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setWallpaper: (state, action) => {
      state.wallpaper = action.payload;
      localStorage.setItem('wallpaper', action.payload);
    },
  },
});

export const { 
  setConversations, 
  setActiveConversation, 
  setActiveMessages, 
  addMessage, 
  addConversation,
  updateMessageAsDeleted,
  markConversationRead,
  markMyMessagesReadInChat,
  updateParticipantStatus,
  setBulkParticipantStatus,
  clearChatState,
  setTheme,
  setWallpaper,
} = chatSlice.actions;

export default chatSlice.reducer;
