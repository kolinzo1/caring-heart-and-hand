const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/profile", authMiddleware, async (req, res) => {
  // Get user profile logic here
});

router.put("/profile", authMiddleware, async (req, res) => {
  // Update user profile logic here
});

module.exports = router;
