const getAllGenres = async (req, res) => {
  try {
    res.json({ genres: [] });
  } catch (error) {
    res.status(500).json({ error: "Genres error" });
  }
};

module.exports = { getAllGenres };
