const express = require("express");
const { getAllGenres } = require("../controllers/genreController");

const router = express.Router();

router.get("/", getAllGenres);

module.exports = router;
