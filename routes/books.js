const express = require("express");
const { getAllBooks, getBookById, getPopularBooks } = require("../controllers/bookController");

const router = express.Router();

router.get("/", getAllBooks);
router.get("/popular", getPopularBooks);
router.get("/:id", getBookById);

module.exports = router;
