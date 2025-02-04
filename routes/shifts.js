const express = require("express");
const router = express.Router();

// POST new shift
router.post("/shifts", async (req, res) => {
  try {
    const { clientId, date, startTime, endTime, notes } = req.body;
    const userId = req.user.id;

    const [result] = await req.app.get("db").query(
      `INSERT INTO shifts (user_id, client_id, date, start_time, end_time, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, clientId, date, startTime, endTime, notes]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET shifts
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const [shifts] = await req.app.get("db").query(
      `SELECT s.*, c.first_name, c.last_name
       FROM shifts s
       JOIN clients c ON s.client_id = c.id
       WHERE s.user_id = ?
       ORDER BY s.date DESC, s.start_time DESC`,
      [userId]
    );

    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
