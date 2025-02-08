const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware"); // Make sure to import auth middleware

// Add auth middleware to protect routes
router.use(authMiddleware);

// POST new shift
router.post("/", async (req, res) => {
  // Changed from "/shifts" to "/"
  try {
    const { clientId, date, startTime, endTime, notes, serviceType } = req.body;
    const userId = req.user.id;

    const [result] = await req.app.get("db").query(
      `INSERT INTO shifts (user_id, client_id, date, start_time, end_time, notes, service_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, clientId, date, startTime, endTime, notes, serviceType]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("Error creating shift:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET shifts
router.get("/", async (req, res) => {
  try {
    console.log("User from auth:", req.user); // Check user auth data
    const userId = req.user.id;
    console.log("Query params:", req.query); // Log query parameters

    const query = `
      SELECT 
        s.*, c.first_name, c.last_name
      FROM shifts s
      JOIN clients c ON s.client_id = c.id
      WHERE s.user_id = ?
      ORDER BY s.date DESC, s.start_time DESC`;

    console.log("Executing query:", query); // Log the query
    console.log("With userId:", userId); // Log the userId

    const [shifts] = await req.app.get("db").query(query, [userId]);
    console.log("Query results:", shifts); // Log the results

    if (!Array.isArray(shifts)) {
      console.log("Shifts is not an array:", typeof shifts, shifts);
      throw new Error("Database did not return an array");
    }

    res.json(shifts);
  } catch (error) {
    console.error("Detailed error in /api/shifts:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
    res.status(500).json({
      message: "Server error",
      details: error.message,
    });
  }
});

module.exports = router;
