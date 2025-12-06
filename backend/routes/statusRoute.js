const express = require("express");
const statusController = require("../controllers/statusController");
const { model } = require("mongoose");
const { multeMiddleware } = require("../config/cloudinaryConfig");
const authMiddleware = require("../middileware/authMiddleware");

const router = express.Router();

// Create status
router.post("/", authMiddleware, multeMiddleware, statusController.createStatus);

// Get all statuses
router.get("/", authMiddleware, statusController.getStatuses);

// View status
router.put("/:statusId/view", authMiddleware, statusController.viewStatus);

// Delete status
router.delete("/:statusId", authMiddleware, statusController.deleteStatus);

module.exports = router;