const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

// Get all clients
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [clients] = await req.app
      .get("db")
      .query("SELECT id, first_name, last_name, email, phone FROM clients");
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Error fetching clients" });
  }
});

module.exports = router;
