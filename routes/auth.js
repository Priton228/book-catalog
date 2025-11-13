﻿const express = require("express");
const { register, login, getProfile, verifyReset, resetPassword } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticate, getProfile);
router.post("/verify-reset", verifyReset);
router.post("/reset-password", resetPassword);

module.exports = router;
