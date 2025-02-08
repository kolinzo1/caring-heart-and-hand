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
    const userId = req.user.id;
    const { client, startDate, endDate, status } = req.query;

    let query = `
      SELECT 
        s.id,
        s.date,
        s.start_time as startTime,
        s.end_time as endTime,
        s.notes,
        s.service_type as serviceType,
        c.id as client_id,
        c.first_name,
        c.last_name
      FROM shifts s
      JOIN clients c ON s.client_id = c.id
      WHERE s.user_id = ?
    `;

    const queryParams = [userId];

    // Add filters if provided
    if (client && client !== "all") {
      query += " AND s.client_id = ?";
      queryParams.push(client);
    }
    if (startDate) {
      query += " AND s.date >= ?";
      queryParams.push(startDate);
    }
    if (endDate) {
      query += " AND s.date <= ?";
      queryParams.push(endDate);
    }
    if (status && status !== "all") {
      query += " AND s.status = ?";
      queryParams.push(status);
    }

    query += " ORDER BY s.date DESC, s.start_time DESC";

    const [shifts] = await req.app.get("db").query(query, queryParams);

    // Transform the data to match frontend expectations
    const formattedShifts = shifts.map((shift) => ({
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes,
      serviceType: shift.serviceType,
      client: {
        id: shift.client_id,
        first_name: shift.first_name,
        last_name: shift.last_name,
      },
    }));

    res.json(formattedShifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
