const express = require("express");
const { createOrder, getUserOrders, getOrderById } = require("../controllers/orderController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticate, createOrder);
router.get("/my-orders", authenticate, getUserOrders);
router.get("/:id", authenticate, getOrderById);

module.exports = router;
