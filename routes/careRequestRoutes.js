const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/", async (req, res) => {
  // Create care request logic here
});

router.get("/", authMiddleware, async (req, res) => {
  // Get care requests logic here
});

module.exports = router;
