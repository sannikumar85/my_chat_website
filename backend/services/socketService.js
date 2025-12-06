const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");

//map to store online user
const onlineUsers = new Map();

//map to typing satauts
const typingUsersus = new Map();

const initlizeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  //when new socket connection established
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    let userId = null;

    //handle user connection
    socket.on("userConnected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId); //join personal roomm for mdirect emit
        //update user dstaus
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // notify all user are online
        io.emit("user_status", { userId, isOnline: true });
      } catch (error) {
        console.error("Error in userConnected event:", error);
      }
    });

    //retutn online users
    socket.on("user_status", (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    //forward massge to recievver
    socket.on("send_message", async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?._id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }
      } catch (error) {
        console.error("error sending ", error);
        socket.emit("message_error", { error: "failed to send message" });
      }
    });

    //massge read

    socket.on("message_read", async ({ messageIds, senderId }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: "read" } }
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.error("error updating message read status ", error);
      }
    });

    //HANDLE TYPING START
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (!typingUsersus.has(userId)) typingUsersus.set(userId, {});

      const userTyping = typingUsersus.get(userId);

      userTyping[conversationId] = true;

      //clear any existing timeout
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }
      //autostop typing after 3s
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 3000);

      //notify receiver
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (typingUsersus.has(userId)) {
        const userTyping = typingUsersus.get(userId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }

      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    // add update reasct

    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId, reactionUserid }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;
          const exitingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactionUserId
          );

          if (exitingIndex > -1) {
            const exitingIndex = message.reactions(exitingIndex);
            if (exitingIndex.emoji === emoji) {
              message.reactions.splice(exitingIndex, 1);
            } else {
              message.reactions[exitingIndex].emoji = emoji;
            }
          } else {
            message.reactions.push({ user: reactionUserId, emoji });
          }
          await message.save();

          const populatedMessage = await Message.findByOne(message?._id)
            .populate("sender", "name profilePicture")
            .populate("receiver", "name profilePicture")
            .populate("reactions.user", "username");

          const reactionupdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };

          const senderSocket = onlineUsers.get(
            populatedMessage.senderId._id.toString()
          );
          const receiverSocket = onlineUsers.get(
            populatedMessage.receiver?._id.toString()
          );

          if (senderSocket)
            io.to(senderSocket).emit("reaction_update", reactionupdated);
          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_update", reactionupdated);
        } catch (error) {
          console.log("error handling reaction", error);
        }
      }
    );

    // Video Call Events
    // Map to store active call timeouts
    const callTimeouts = new Map();

    socket.on("initiate_video_call", (data) => {
      console.log('Received initiate_video_call event:', data);
      const { to, from, offer } = data;
      console.log(`Looking for user ${to} in online users:`, onlineUsers.has(to));
      console.log('Online users:', Array.from(onlineUsers.keys()));
      
      const receiverSocketId = onlineUsers.get(to);
      console.log(`Receiver socket ID for ${to}:`, receiverSocketId);
      
      if (receiverSocketId) {
        const callId = `${from._id}-${to}-${Date.now()}`;
        
        console.log(`Sending incoming_video_call to socket ${receiverSocketId}`);
        // Send incoming call notification
        io.to(receiverSocketId).emit("incoming_video_call", {
          from,
          offer,
          callId: callId
        });
        
        console.log(`Video call initiated from ${from._id} to ${to} with callId: ${callId}`);
        
        // Set timeout for auto-cut after 30 seconds
        const timeout = setTimeout(() => {
          console.log(`Auto-cutting call ${callId} after 30 seconds`);
          
          // Notify both parties that call was auto-cut
          io.to(receiverSocketId).emit("video_call_auto_ended", {
            callId: callId,
            reason: 'timeout'
          });
          
          const callerSocketId = onlineUsers.get(from._id);
          if (callerSocketId) {
            io.to(callerSocketId).emit("video_call_auto_ended", {
              callId: callId,
              reason: 'timeout'
            });
          }
          
          // Clean up timeout
          callTimeouts.delete(callId);
        }, 30000); // 30 seconds
        
        // Store timeout reference
        callTimeouts.set(callId, { timeout, callerId: from._id, receiverId: to });
      } else {
        console.log(`User ${to} is not online or not found`);
        // Notify caller that recipient is offline
        const callerSocketId = onlineUsers.get(from._id);
        if (callerSocketId) {
          io.to(callerSocketId).emit("video_call_failed", {
            reason: 'user_offline',
            message: 'User is not online'
          });
        }
      }
    });

    socket.on("accept_video_call", (data) => {
      const { to, answer, callId } = data;
      const callerSocketId = onlineUsers.get(to);
      
      // Clear timeout if call is accepted
      if (callId && callTimeouts.has(callId)) {
        clearTimeout(callTimeouts.get(callId).timeout);
        callTimeouts.delete(callId);
        console.log(`Call timeout cleared for ${callId}`);
      }
      
      if (callerSocketId) {
        io.to(callerSocketId).emit("video_call_accepted", {
          answer,
          from: userId
        });
        console.log(`Video call accepted by ${userId} for ${to}`);
      }
    });

    socket.on("decline_video_call", (data) => {
      const { to, callId } = data;
      const callerSocketId = onlineUsers.get(to);
      
      // Clear timeout if call is declined
      if (callId && callTimeouts.has(callId)) {
        clearTimeout(callTimeouts.get(callId).timeout);
        callTimeouts.delete(callId);
        console.log(`Call timeout cleared for declined call ${callId}`);
      }
      
      if (callerSocketId) {
        io.to(callerSocketId).emit("video_call_declined", {
          from: userId
        });
        console.log(`Video call declined by ${userId} for ${to}`);
      }
    });

    socket.on("end_video_call", (data) => {
      const { to, callId } = data;
      const otherPartySocketId = onlineUsers.get(to);
      
      // Clear timeout if call is ended manually
      if (callId && callTimeouts.has(callId)) {
        clearTimeout(callTimeouts.get(callId).timeout);
        callTimeouts.delete(callId);
        console.log(`Call timeout cleared for ended call ${callId}`);
      }
      
      if (otherPartySocketId) {
        io.to(otherPartySocketId).emit("video_call_ended", {
          from: userId
        });
        console.log(`Video call ended by ${userId} for ${to}`);
      }
    });

    socket.on("ice_candidate", (data) => {
      const { to, candidate } = data;
      const receiverSocketId = onlineUsers.get(to);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("ice_candidate", {
          candidate,
          from: userId
        });
      }
    });

    socket.on("video_call_offer", (data) => {
      const { to, offer } = data;
      const receiverSocketId = onlineUsers.get(to);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("video_call_offer", {
          offer,
          from: userId
        });
      }
    });

    socket.on("video_call_answer", (data) => {
      const { to, answer } = data;
      const callerSocketId = onlineUsers.get(to);
      
      if (callerSocketId) {
        io.to(callerSocketId).emit("video_call_answer", {
          answer,
          from: userId
        });
      }
    });

    //handle disconnention and mark user ofline
    const handleDisconnected = async () => {
      if (!userId) return;

      try {
        onlineUsers.delete(userId);

        // Clean up any active call timeouts for this user
        for (const [callId, callData] of callTimeouts.entries()) {
          if (callData.callerId === userId || callData.receiverId === userId) {
            clearTimeout(callData.timeout);
            callTimeouts.delete(callId);
            console.log(`Cleaned up call timeout ${callId} for disconnected user ${userId}`);
          }
        }

        if (typingUsersus.has(userId)) {
          const userTyping = typingUsersus.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
          });

          typingUsersus.delete(userId);
        }

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.leave(userId);
        console.log(`User ${userId} disconnected`);
      } catch (error) {
        console.error("Error handling disconnection ", error);
      }
    };

    //disconnect socket

    socket.on("disconnect", handleDisconnected);
  });

  io.socketUserMap = onlineUsers;

  return io;
};

module.exports = initlizeSocket;
