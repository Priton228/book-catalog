const express = require("express");
const { getAllBooks, getBookById, getPopularBooks, getActivePromotions } = require("../controllers/bookController");

const router = express.Router();

router.get("/", getAllBooks);
router.get("/popular", getPopularBooks);
router.get("/promotions", getActivePromotions);
router.get("/:id", getBookById);

module.exports = router;
