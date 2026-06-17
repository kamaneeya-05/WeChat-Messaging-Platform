  import { useEffect, useState, useCallback, useRef } from 'react';
  import { io } from 'socket.io-client';
  import axios from 'axios';
  import { useAppDispatch, useAppSelector } from '../store/hooks';
  import { API_BASE_URL } from '../config/api';
  import { 
    setConversations, 
    setActiveConversation, 
    setActiveMessages, 
    addMessage, 
    updateMessageAsDeleted,
    addConversation,
    markConversationRead,
    markMyMessagesReadInChat,
  } from '../store/features/chatSlice';

  const ENDPOINT = API_BASE_URL; // Make sure this matches your Express server port

  export function useChat() {
    const dispatch = useAppDispatch();
    
    // Pulling global state from Redux
    const { user, isAuthenticated, token } = useAppSelector((state) => state.auth);
    const { conversations, activeConversation, activeMessages } = useAppSelector((state) => state.chat);
    
    const [socket, setSocket] = useState(null);
    const offlineSyncSentRef = useRef(false);

    // 1. Establish Socket Connection on Login
    useEffect(() => {
      if (isAuthenticated && user) {
        const newSocket = io(ENDPOINT);
        setSocket(newSocket);

      newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('setup', user._id || user.id); 
    });

        return () => {
          newSocket.disconnect();
        };
      }
    }, [isAuthenticated, user]);

    // 1b. Best-effort offline update on tab/window close
    useEffect(() => {
      if (!isAuthenticated || !token) return;

      offlineSyncSentRef.current = false;

      const syncOfflineStatus = () => {
        if (offlineSyncSentRef.current) return;
        offlineSyncSentRef.current = true;

        fetch(`${ENDPOINT}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ source: 'page-unload' }),
          keepalive: true,
        }).catch(() => {
          // Best-effort only: ignore network shutdown errors on unload
        });
      };

      const handleBeforeUnload = () => syncOfflineStatus();
      const handlePageHide = () => syncOfflineStatus();

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handlePageHide);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handlePageHide);
      };
    }, [isAuthenticated, token]);

  

    // 2. Fetch Initial Conversations (Sidebar Data)
    useEffect(() => {
      if (isAuthenticated) {
        const fetchChats = async () => {
          try {
            const { data } = await axios.get(`${ENDPOINT}/api/chats`);
            dispatch(setConversations(data));
            dispatch(setActiveConversation(null));
            dispatch(setActiveMessages([]));
          } catch (error) {
            console.error("Failed to fetch chats", error);
          }
        };
        fetchChats();
      }
    }, [isAuthenticated, dispatch]);

    // 3. Handle Active Conversation Logic (Fetch Messages & Listen for Real-time Updates)
    useEffect(() => {
      if (!activeConversation || !socket) return;

      // Join the specific room for this chat
      socket.emit('join chat', activeConversation._id);

      // Fetch message history from MongoDB
      const fetchMessages = async () => {
        try {
          const { data } = await axios.get(`${ENDPOINT}/api/messages/${activeConversation._id}`);
          dispatch(setActiveMessages(data));
          await axios.patch(`${ENDPOINT}/api/messages/read/${activeConversation._id}`);
          dispatch(markConversationRead(activeConversation._id));
          socket.emit('messages read', { chatId: activeConversation._id, readerId: user?._id || user?.id });
        } catch (error) {
          console.error("Failed to fetch messages", error);
        }
      };
      fetchMessages();

      // Setup real-time socket listeners
     const handleNewMessage = (newMessage) => {
        // CHANGE THIS LINE:
        if (newMessage.senderId._id !== user?._id) {
          dispatch(addMessage(newMessage));
        }
      };

      const handleMessageDeleted = (deletedMessage) => {
        dispatch(updateMessageAsDeleted(deletedMessage._id));
      };

      const handleMessagesRead = (payload) => {
        if (activeConversation?._id === payload.chatId) {
          dispatch(markMyMessagesReadInChat(payload.chatId));
        }
      };

      socket.on('message received', handleNewMessage);
      socket.on('message deleted', handleMessageDeleted);
      socket.on('messages read', handleMessagesRead);

      // Cleanup: Leave room and remove listeners when switching chats
      return () => {
        socket.emit('leave chat', activeConversation._id);
        socket.off('message received', handleNewMessage);
        socket.off('message deleted', handleMessageDeleted);
        socket.off('messages read', handleMessagesRead);
      };
    }, [activeConversation, socket, dispatch, user]);

    // 4. UI Actions
    
    // Note: Adjusting the parameter to accept the ID or the full Chat object based on how your Sidebar triggers it
    const selectConversation = useCallback((conversationIdOrObject) => {
      let chatToSelect;
      
      if (typeof conversationIdOrObject === 'string') {
        chatToSelect = conversations.find(c => c._id === conversationIdOrObject);
      } else {
        chatToSelect = conversationIdOrObject;
      }

      if (chatToSelect) {
        dispatch(setActiveConversation(chatToSelect));
      }
    }, [conversations, dispatch]);

    const startDirectMessage = async (email) => {
    if (!email.trim() || !user) return { error: 'Please enter an email' };

    try {
      const searchRes = await axios.get(`${ENDPOINT}/api/users?search=${encodeURIComponent(email.trim())}`);
      
      if (searchRes.data.length === 0) {
        return { error: 'User not found for that email' };
      }

      const targetUser = searchRes.data[0];

      // 2. Create or fetch the 1:1 chat room with this user
      const chatRes = await axios.post(`${ENDPOINT}/api/chats`, {
        participantId: targetUser._id,
        isGroup: false
      });

      const newChat = chatRes.data;

      // 3. Update Redux state
      // import addConversation at the top of useChat!
      dispatch(addConversation(newChat)); 
      dispatch(setActiveConversation(newChat));

      return { success: true };
    } catch (error) {
      console.error("Failed to start chat", error);
      return { error: 'An error occurred while creating the chat' };
    }
  };

   const sendMessage = useCallback(async (text, file = null) => {
  // 1. UPDATED VALIDATION: Allow send if there is text OR a file
  if ((!text.trim() && !file) || !activeConversation || !socket) return;

  try {
    let responseData;

    // 2. CHECK IF IT IS A MEDIA MESSAGE OR TEXT MESSAGE
    if (file) {
      // --- MEDIA UPLOAD ---
      // We must use FormData to send files to the Express server
      const formData = new FormData();
      
      // 'media' MUST match the name in your Express route: upload.single('media')
      formData.append('media', file); 
      formData.append('chatId', activeConversation._id);
      if (text.trim()) {
        formData.append('content', text); // Optional text caption
      }

      // POST to the new /media route
      const { data } = await axios.post(`${ENDPOINT}/api/messages/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // Note: Your Authorization token should automatically attach if we set it up in Axios defaults!
        },
      });
      responseData = data;

    } else {
      // --- REGULAR TEXT MESSAGE ---
      // POST to the original route
      const { data } = await axios.post(`${ENDPOINT}/api/messages`, {
        content: text,
        chatId: activeConversation._id,
      });
      responseData = data;
    }

    // 3. Update Redux immediately so the UI feels instant
    dispatch(addMessage(responseData));

    // 4. Broadcast to other users in the room
    socket.emit('new message', responseData);
    
  } catch (error) {
    console.error("Failed to send message", error);
    // Optional: If you get a 413 error, the file was larger than the 15MB limit in multer
    if (error.response?.status === 413) {
      alert("File is too large!");
    }
  }
}, [activeConversation, socket, dispatch]);

    return {
      conversations,
      activeConversation,
      activeMessages,
      selectConversation,
      sendMessage,
      startDirectMessage,
      socket,
    };
  }
