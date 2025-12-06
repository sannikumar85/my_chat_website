const express = require("express");
const authController = require("../controllers/authController");
const { model } = require("mongoose");
const { multeMiddleware } = require("../config/cloudinaryConfig");
const authMiddleware = require("../middileware/authMiddleware");



const router= express.Router();

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.get("/logout", authController.logout);

//protected routes
router.put('/update-profile',authMiddleware,multeMiddleware,authController.updateProfile)
router.get("/check-auth",authMiddleware,authController.checAuthenticated)
router.get("/users", authMiddleware, authController.getAllUsers);


module.exports = router;