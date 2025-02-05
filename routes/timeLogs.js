const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { clientId, date, startTime, endTime, notes, serviceType } = req.body;
    const userId = req.user.id;

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
    res.status(500).json({ message: "Error creating time log" });
  }
});

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

module.exports = router;
