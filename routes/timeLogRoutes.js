const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  // Create time log logic here
});

router.get("/", authMiddleware, async (req, res) => {
  // Get time logs logic here
});

module.exports = router;
