const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

// Create time log
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { clientId, date, startTime, endTime, notes, serviceType } = req.body;

    // Debug log to check what we're getting from auth
    console.log("Auth user:", req.user);

    // Make sure we have a user ID
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized - User ID not found",
        details: "Missing user ID from authentication",
      });
    }

    const userId = req.user.id;

    // Debug log the data we're about to insert
    console.log("Inserting data:", {
      userId,
      clientId,
      date,
      startTime,
      endTime,
      notes,
      serviceType,
    });

    const [result] = await req.app.get("db").query(
      `INSERT INTO time_logs (user_id, client_id, date, start_time, end_time, notes, service_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, clientId, date, startTime, endTime, notes, serviceType]
    );

    res.status(201).json({
      id: result.insertId,
      message: "Time log created successfully",
    });
  } catch (error) {
    console.error("Error creating time log:", error);
    // Send back more detailed error information
    res.status(500).json({
      message: "Error creating time log",
      details: error.message,
      // If it's a SQL error, include the SQL error code
      sqlErrorCode: error.code,
    });
  }
});

// Test route without auth
router.get("/test", (req, res) => {
  res.json({ message: "Time logs route working" });
});

// Get time logs for user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [logs] = await req.app.get("db").query(
      `SELECT tl.*, c.first_name, c.last_name 
         FROM time_logs tl
         JOIN clients c ON tl.client_id = c.id
         WHERE tl.user_id = ?
         ORDER BY tl.date DESC, tl.start_time DESC`,
      [userId]
    );

    res.json(logs);
  } catch (error) {
    console.error("Error fetching time logs:", error);
    res.status(500).json({ message: "Error fetching time logs" });
  }
});

// Get recent time logs for user
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Fetching recent logs for user:", userId);

    const [logs] = await req.app.get("db").query(
      `SELECT 
        tl.*,
        c.first_name,
        c.last_name,
        c.id as client_id
       FROM time_logs tl
       JOIN clients c ON tl.client_id = c.id
       WHERE tl.user_id = ?
       ORDER BY tl.created_at DESC
       LIMIT 5`,
      [userId]
    );

    console.log("Retrieved logs:", logs); // Debug log

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      first_name: log.first_name,
      last_name: log.last_name,
      date: log.date,
      start_time: log.start_time,
      end_time: log.end_time,
      notes: log.notes,
      service_type: log.service_type,
      client_id: log.client_id,
    }));

    console.log("Sending formatted logs:", formattedLogs); // Debug log
    res.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching recent time logs:", error);
    res.status(500).json({ message: "Error fetching recent time logs" });
  }
});

// Get single time log with client details
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [logs] = await req.app.get("db").query(
      `SELECT 
        tl.*,
        c.first_name,
        c.last_name,
        c.id as client_id
       FROM time_logs tl
       JOIN clients c ON tl.client_id = c.id
       WHERE tl.id = ? AND tl.user_id = ?
       LIMIT 1`,
      [id, userId]
    );

    if (logs.length === 0) {
      return res.status(404).json({ message: "Shift not found" });
    }

    const shift = {
      id: logs[0].id,
      clientName: `${logs[0].first_name} ${logs[0].last_name}`,
      date: logs[0].date,
      start_time: logs[0].start_time,
      end_time: logs[0].end_time,
      notes: logs[0].notes,
      service_type: logs[0].service_type,
      client_id: logs[0].client_id,
    };

    res.json(shift);
  } catch (error) {
    console.error("Error fetching time log:", error);
    res.status(500).json({ message: "Error fetching time log" });
  }
});

module.exports = router;
