// Utility to reset localStorage when data structure changes
export const resetChatStorage = () => {
  try {
    localStorage.removeItem('chat-storage');
    console.log('Chat storage cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear chat storage:', error);
    return false;
  }
};

// Call this function if you encounter data structure issues
export const migrateChatStorage = () => {
  try {
    const storage = localStorage.getItem('chat-storage');
    if (storage) {
      const data = JSON.parse(storage);
      if (data.state && data.state.onlineUsers && !Array.isArray(data.state.onlineUsers)) {
        data.state.onlineUsers = [];
        localStorage.setItem('chat-storage', JSON.stringify(data));
        console.log('Chat storage migrated successfully');
        return true;
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to migrate chat storage:', error);
    resetChatStorage();
    return false;
  }
};
