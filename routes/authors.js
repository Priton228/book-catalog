const express = require("express");
const { getAllAuthors } = require("../controllers/authorController");

const router = express.Router();

router.get("/", getAllAuthors);

module.exports = router;
