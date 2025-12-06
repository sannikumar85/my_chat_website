const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Conversation = require("../models/Conversation");
const response = require("../utils/responseHandler");
const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    
    // Handle file upload - with .any() middleware, files are in req.files array
    const file = req.files && req.files.length > 0 ? req.files[0] : null;

    const participants = [senderId, receiverId].sort();
    let conversation = await Conversation.findOne({
      participants: participants,
    });

    if (!conversation) {
      conversation = new Conversation({
        participants,
      });
      await conversation.save();
    }
    let imageOrVideoUrl = null;
    let contentType = null;

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "File upload failed");
      }
      imageOrVideoUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith("image/")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Invalid content");
    }

    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });

    await message.save();
    if (message?.content) {
      conversation.lastMessage = message?._id;
    }
    conversation.unreadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    //socket send mesae addded

    if (req.io && req.socketUserMap) {
      // broadcast status
      const receiverSocketId = req.socketUserMap.get(receiverId);
      console.log(`Attempting to send message to receiver ${receiverId}, socket ID: ${receiverSocketId}`);
      console.log('Available socket connections:', Array.from(req.socketUserMap.keys()));
      
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("receive_message", populatedMessage);
        console.log('Message emitted to receiver socket');
        message.messageStatus = "delivered";
        await message.save();
      } else {
        console.log('Receiver not online, message not delivered via socket');
      }
    } else {
      console.log('Socket IO or socketUserMap not available');
    }

    return response(res, 200, "Message sent successfully", populatedMessage);
  } catch (error) {
    return response(res, 500, "Internal server error");
  }
};

//get all converstion

exports.getConversations = async (req, res) => {
  const userId = req.user.userId;
  try {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(
      res,
      200,
      "Conversations fetched successfully",
      conversations
    );
  } catch (error) {
    return response(res, 500, "Internal server error");
  }
};

//get messages for specific conversation

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      return response(res, 403, "Unauthorized access to this conversation");
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort("createdAt");

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["send", "delivered"] },
      },
      { $set: { messageStatus: "read" } }
    );

    conversation.unreadCount = 0;
    await conversation.save();
    return response(res, 200, "Messages fetched successfully", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

exports.markAsRead = async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user.userId;

  try {
    let messages = await Message.find({
      _id: { $in: messageId },
      receiver: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageId },
        receiver: userId,
      },
      { $set: { messageStatus: "read" } }
    );

    //notify to orignal sender 
    if (req.io && req.socketUserMap) {
      for (const message of messages){
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if(senderSocketId){
          const updatedMessage={
            _id:message._id,
            messageStatus:"read",

          }
          req.io.to(senderSocketId).emit("message_read",updatedMessage);
        }
      }
      
    }


    return response(res, 200, "Messages marked as read", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return response(res, 404, "Message not found");
    }
    if (message.sender.toString() !== userId) {
      return response(res, 403, "Unauthorized access");
    }

    await Message.findByIdAndDelete(messageId);


    //socket delete message 
     if (req.io && req.socketUserMap) {
      const receiverSocketId=req.socketUserMap.get(message.receiver.toString())
      if(receiverSocketId){
        req.io.to(receiverSocketId).emit("message_deleted",messageId);
      }
    }


    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};
