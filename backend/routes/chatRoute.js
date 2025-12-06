const express = require("express");
const chatController = require("../controllers/chatController");
const { model } = require("mongoose");
const { multeMiddleware } = require("../config/cloudinaryConfig");
const authMiddleware = require("../middileware/authMiddleware");



const router= express.Router();

router.post("/send-message",authMiddleware, multeMiddleware, chatController.sendMessage);
router.get("/conversations", authMiddleware, chatController.getConversations);
router.get("/conversations/:conversationId/messages", authMiddleware, chatController.getMessages);


//protected routes
router.put('/messages/read',authMiddleware,chatController.markAsRead)
router.delete('/messages/:messageId',authMiddleware,chatController.deleteMessage)

module.exports = router;