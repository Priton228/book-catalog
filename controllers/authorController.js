const getAllAuthors = async (req, res) => {
  try {
    res.json({ authors: [] });
  } catch (error) {
    res.status(500).json({ error: "Authors error" });
  }
};

module.exports = { getAllAuthors };
