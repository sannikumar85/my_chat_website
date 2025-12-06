import axiosInstance from "./url.service";

// Send message
export const sendMessage = async (messageData) => {
  try {
    const response = await axiosInstance.post("/chat/send-message", messageData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Send message with file
export const sendMessageWithFile = async (formData) => {
  try {
    const response = await axiosInstance.post("/chat/send-message", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Get conversations
export const getConversations = async () => {
  try {
    const response = await axiosInstance.get("/chat/conversations");
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Get messages for a specific conversation
export const getMessages = async (conversationId) => {
  try {
    const response = await axiosInstance.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (messageIds) => {
  try {
    const response = await axiosInstance.put("/chat/messages/read", {
      messageId: messageIds
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Delete message
export const deleteMessage = async (messageId) => {
  try {
    const response = await axiosInstance.delete(`/chat/messages/${messageId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};
