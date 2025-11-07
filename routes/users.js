const express = require("express");
const { getAllUsers } = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, authorize("admin"), getAllUsers);

module.exports = router;
