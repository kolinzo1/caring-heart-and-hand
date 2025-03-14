const express = require("express");
const router = express.Router();
const CareRequest = require("../models/CareRequest");
const authMiddleware = require("../middleware/authMiddleware");
const { sendRequestNotification } = require("../utilities/email");

// Create care request
router.post("/", async (req, res) => {
  console.log("Received care request:", req.body);
  try {
    const pool = req.app.get("db");

    if (!pool) {
      console.error("Database connection pool is undefined");
      return res.status(500).json({ message: "Database connection error" });
    }

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

    console.log("Extracted data:", { firstName, lastName, email, careType });

    // Convert empty strings to null for SQL insertion
    const query = `INSERT INTO care_requests (
      first_name, last_name, email, phone, address, city, state, zip_code,
      care_type, start_date, frequency, preferred_time,
      recipient_name, recipient_age, recipient_relation, mobility_status, medical_conditions,
      specific_needs, additional_notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    console.log("Executing query:", query);

    const values = [
      firstName,
      lastName,
      email,
      phone,
      address || null,
      city || null,
      state || null,
      zipCode || null,
      careType,
      startDate,
      frequency,
      preferredTime || null,
      recipientName,
      recipientAge,
      recipientRelation || null,
      mobilityStatus,
      medicalConditions || null,
      specificNeeds || null,
      additionalNotes || null,
      "new",
    ];

    console.log("With values:", values);

    const [result] = await pool.query(query, values);

    console.log("Query result:", result);

    res.status(201).json({
      id: result.insertId,
      message: "Care request created successfully",
    });
    // After successfully saving to database, send email notification
    await sendRequestNotification(req.body);

    res.status(201).json({
      id: result.insertId,
      message: "Care request created successfully",
    });
  } catch (error) {
    console.error("Detailed error in care request creation:", error);
    res.status(500).json({
      message: "Error creating care request",
      error:
        process.env.NODE_ENV === "production" ? "Server error" : error.message,
      code: error.code,
    });
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

// Update care request status
router.put("/:id/status", async (req, res) => {
  try {
    const pool = req.app.get("db");
    const { id } = req.params;
    const { status } = req.body;

    // Add some debug logging
    console.log(`Updating request ${id} status to: ${status}`);

    if (
      !status ||
      !["new", "contacted", "scheduled", "declined"].includes(status)
    ) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const [result] = await pool.query(
      "UPDATE care_requests SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Care request not found" });
    }

    res.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating care request status:", error);
    res.status(500).json({ message: "Error updating status" });
  }
});

module.exports = router;
