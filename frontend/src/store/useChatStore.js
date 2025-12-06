import { create } from "zustand";
import { persist } from "zustand/middleware";

const useChatStore = create(
  persist(
    (set, get) => ({
      messages: {},
      conversations: [],
      activeConversation: null,
      isLoading: false,
      typingUsers: {},
      onlineUsers: [], // Array of online user IDs
      messageReactions: {}, // { messageId: { emoji: [userIds] } }
      
      // Set messages for a conversation (with duplicate removal)
      setMessages: (conversationId, messages) =>
        set((state) => {
          // Remove duplicates based on _id, keeping the latest version
          const uniqueMessages = [];
          const seenIds = new Set();
          
          // Process messages in reverse to keep the latest duplicates
          const sortedMessages = [...(messages || [])].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          
          for (const message of sortedMessages) {
            if (!seenIds.has(message._id)) {
              seenIds.add(message._id);
              uniqueMessages.unshift(message); // Add to beginning to maintain order
            }
          }
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: uniqueMessages,
            },
          };
        }),

      // Add a new message (with duplicate prevention)
      addMessage: (conversationId, message) =>
        set((state) => {
          const existingMessages = state.messages[conversationId] || [];
          
          // Check if message already exists to prevent duplicates
          const messageExists = existingMessages.some(
            (existingMsg) => existingMsg._id === message._id || 
            (existingMsg.tempId && existingMsg.tempId === message.tempId)
          );
          
          if (messageExists) {
            console.log('Message already exists, skipping duplicate:', message._id);
            return state;
          }
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [
                ...existingMessages,
                message,
              ],
            },
          };
        }),

      // Update message status
      updateMessageStatus: (conversationId, messageId, status) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).map(
              (msg) =>
                msg._id === messageId ? { ...msg, messageStatus: status } : msg
            ),
          },
        })),

      // Delete message
      removeMessage: (conversationId, messageId) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).filter(
              (msg) => msg._id !== messageId
            ),
          },
        })),

      // Set conversations
      setConversations: (conversations) =>
        set({ conversations }),

      // Set active conversation
      setActiveConversation: (conversation) =>
        set({ activeConversation: conversation }),

      // Set loading state
      setLoading: (loading) =>
        set({ isLoading: loading }),

      // Update typing status
      setTypingStatus: (conversationId, userId, isTyping) =>
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: {
              ...state.typingUsers[conversationId],
              [userId]: isTyping,
            },
          },
        })),

      // Update online status
      setOnlineStatus: (userId, isOnline) =>
        set((state) => ({
          onlineUsers: isOnline 
            ? [...new Set([...state.onlineUsers, userId])] // Add user if online (avoid duplicates)
            : state.onlineUsers.filter(id => id !== userId), // Remove user if offline
        })),

      // Add/update message reaction
      addReaction: (messageId, userId, emoji) =>
        set((state) => {
          const messageReactions = { ...state.messageReactions };
          if (!messageReactions[messageId]) {
            messageReactions[messageId] = {};
          }
          if (!messageReactions[messageId][emoji]) {
            messageReactions[messageId][emoji] = [];
          }
          if (!messageReactions[messageId][emoji].includes(userId)) {
            messageReactions[messageId][emoji] = [...messageReactions[messageId][emoji], userId];
          }
          return { messageReactions };
        }),

      // Remove message reaction
      removeReaction: (messageId, userId, emoji) =>
        set((state) => {
          const messageReactions = { ...state.messageReactions };
          if (messageReactions[messageId] && messageReactions[messageId][emoji]) {
            messageReactions[messageId][emoji] = messageReactions[messageId][emoji].filter(id => id !== userId);
            if (messageReactions[messageId][emoji].length === 0) {
              delete messageReactions[messageId][emoji];
            }
            if (Object.keys(messageReactions[messageId]).length === 0) {
              delete messageReactions[messageId];
            }
          }
          return { messageReactions };
        }),

      // Clear all data
      clearChatData: () =>
        set({
          messages: {},
          conversations: [],
          activeConversation: null,
          typingUsers: {},
          onlineUsers: [],
          messageReactions: {},
        }),

      // Clean up temporary messages (remove messages with tempId that are old)
      cleanupTempMessages: () =>
        set((state) => {
          const now = new Date();
          const cleanedMessages = {};
          
          Object.keys(state.messages).forEach(conversationId => {
            const messages = state.messages[conversationId] || [];
            const filteredMessages = messages.filter(msg => {
              // Keep message if it doesn't have tempId, or if it's less than 1 minute old
              if (!msg.tempId) return true;
              const messageAge = now - new Date(msg.createdAt);
              return messageAge < 60000; // 1 minute
            });
            cleanedMessages[conversationId] = filteredMessages;
          });
          
          return {
            messages: cleanedMessages,
          };
        }),
    }),
    {
      name: "chat-storage",
      getStorage: () => localStorage,
      // Migration function to handle data structure changes
      migrate: (persistedState, version) => {
        if (persistedState.onlineUsers && !Array.isArray(persistedState.onlineUsers)) {
          persistedState.onlineUsers = [];
        }
        return persistedState;
      },
      version: 1,
    }
  )
);

export default useChatStore;
