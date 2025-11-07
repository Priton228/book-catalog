const getAllUsers = async (req, res) => {
  try {
    res.json({ users: [] });
  } catch (error) {
    res.status(500).json({ error: "Users error" });
  }
};

module.exports = { getAllUsers };
