const express = require("express");
const router = express.Router();
const CareRequest = require("../models/CareRequest");
const authMiddleware = require("../middleware/auth");

// Create care request
router.post("/", async (req, res) => {
  try {
    const careRequest = new CareRequest(req.body);
    await careRequest.save();
    res.status(201).json(careRequest);
  } catch (error) {
    res.status(500).json({ message: "Error creating care request" });
  }
});

// Get all care requests (admin only)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const careRequests = await CareRequest.find().sort({ createdAt: -1 });
    res.json(careRequests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching care requests" });
  }
});
