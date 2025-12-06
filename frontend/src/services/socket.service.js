import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userId) {
    console.log('Attempting to connect socket for user:', userId);
    
    if (!this.socket) {
      this.socket = io(process.env.REACT_APP_API_URL || "http://localhost:8000", {
        withCredentials: true,
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        console.log("Connected to socket server with socket ID:", this.socket.id);
        this.isConnected = true;
        this.socket.emit("userConnected", userId);
        console.log("Emitted userConnected event for user:", userId);
      });

      this.socket.on("disconnect", () => {
        console.log("Disconnected from socket server");
        this.isConnected = false;
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });
    } else {
      console.log("Socket already exists, reusing connection");
      if (this.isConnected) {
        this.socket.emit("userConnected", userId);
        console.log("Re-emitted userConnected event for user:", userId);
      }
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Message events
  onReceiveMessage(callback) {
    if (this.socket) {
      this.socket.on("receive_message", callback);
    }
  }

  sendMessage(messageData) {
    if (this.socket && this.isConnected) {
      this.socket.emit("send_message", messageData);
    }
  }

  onMessageRead(callback) {
    if (this.socket) {
      this.socket.on("message_read", callback);
    }
  }

  onMessageDeleted(callback) {
    if (this.socket) {
      this.socket.on("message_deleted", callback);
    }
  }

  // User status events
  onUserStatus(callback) {
    if (this.socket) {
      this.socket.on("user_status", callback);
    }
  }

  onUserOnline(callback) {
    if (this.socket) {
      this.socket.on("user_online", callback);
    }
  }

  onUserOffline(callback) {
    if (this.socket) {
      this.socket.on("user_offline", callback);
    }
  }

  // Typing events
  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on("user_typing", callback);
    }
  }

  startTyping(conversationId, receiverId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("typing_start", { conversationId, receiverId });
    }
  }

  stopTyping(conversationId, receiverId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("typing_stop", { conversationId, receiverId });
    }
  }

  // Status events
  onNewStatus(callback) {
    if (this.socket) {
      this.socket.on("new_status", callback);
    }
  }

  onStatusViewed(callback) {
    if (this.socket) {
      this.socket.on("status viewd", callback);
    }
  }

  onStatusDeleted(callback) {
    if (this.socket) {
      this.socket.on("status deleted", callback);
    }
  }

  // Message reaction events
  onReactionAdded(callback) {
    if (this.socket) {
      this.socket.on("reaction_added", callback);
    }
  }

  onReactionRemoved(callback) {
    if (this.socket) {
      this.socket.on("reaction_removed", callback);
    }
  }

  addReaction(messageId, emoji) {
    if (this.socket && this.isConnected) {
      this.socket.emit("add_reaction", { messageId, emoji });
    }
  }

  removeReaction(messageId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("remove_reaction", { messageId });
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // General event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Video Call Events
  initiateVideoCall(data) {
    this.emit('initiate_video_call', data);
  }

  acceptVideoCall(data) {
    this.emit('accept_video_call', data);
  }

  declineVideoCall(data) {
    this.emit('decline_video_call', data);
  }

  endVideoCall(data) {
    this.emit('end_video_call', data);
  }

  sendIceCandidate(data) {
    this.emit('ice_candidate', data);
  }

  onIncomingVideoCall(callback) {
    this.on('incoming_video_call', callback);
  }

  onVideoCallAccepted(callback) {
    this.on('video_call_accepted', callback);
  }

  onVideoCallDeclined(callback) {
    this.on('video_call_declined', callback);
  }

  onVideoCallEnded(callback) {
    this.on('video_call_ended', callback);
  }

  onVideoCallAutoEnded(callback) {
    this.on('video_call_auto_ended', callback);
  }

  onVideoCallFailed(callback) {
    this.on('video_call_failed', callback);
  }

  onVideoCallOffer(callback) {
    this.on('video_call_offer', callback);
  }

  onVideoCallAnswer(callback) {
    this.on('video_call_answer', callback);
  }

  onIceCandidate(callback) {
    this.on('ice_candidate', callback);
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  getSocket() {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;
