const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  // Get clients logic here
});

router.post("/", authMiddleware, async (req, res) => {
  // Create client logic here
});

module.exports = router;
