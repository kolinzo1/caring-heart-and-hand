const express = require("express");
const router = express.Router();
const CareRequest = require("../models/CareRequest");
const authMiddleware = require("../middleware/authMiddleware");

// Create care request
router.post("/", async (req, res) => {
  try {
    const pool = req.app.get("db");
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      careType,
      startDate,
      frequency,
      preferredTime,
      recipientName,
      recipientAge,
      recipientRelation,
      mobilityStatus,
      medicalConditions,
      specificNeeds,
      additionalNotes,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO care_requests (
        first_name, last_name, email, phone, address, city, state, zip_code,
        care_type, start_date, frequency, preferred_time,
        recipient_name, recipient_age, recipient_relation, mobility_status, medical_conditions,
        specific_needs, additional_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        careType,
        startDate,
        frequency,
        preferredTime,
        recipientName,
        recipientAge,
        recipientRelation,
        mobilityStatus,
        medicalConditions,
        specificNeeds,
        additionalNotes,
        "new",
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: "Care request created successfully",
    });
  } catch (error) {
    console.error("Error creating care request:", error);
    res.status(500).json({ message: "Error creating care request" });
  }
});

// Get all care requests (admin only)
router.get("/", async (req, res) => {
  try {
    const pool = req.app.get("db");
    const [careRequests] = await pool.query(
      `SELECT * FROM care_requests ORDER BY created_at DESC`
    );
    res.json(careRequests);
  } catch (error) {
    console.error("Error fetching care requests:", error);
    res.status(500).json({ message: "Error fetching care requests" });
  }
});

module.exports = router;
