const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// Get all schedules
router.get("/", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { startDate, endDate, staffId, clientId, status } = req.query;
    const db = req.app.get("db");

    let query = `
      SELECT 
        s.*,
        CONCAT(u.first_name, ' ', u.last_name) as staff_name,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
        u.email as staff_email,
        c.phone as client_phone
      FROM schedules s
      JOIN users u ON s.staff_id = u.id
      JOIN clients c ON s.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += " AND s.date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND s.date <= ?";
      params.push(endDate);
    }
    if (staffId) {
      query += " AND s.staff_id = ?";
      params.push(staffId);
    }
    if (clientId) {
      query += " AND s.client_id = ?";
      params.push(clientId);
    }
    if (status) {
      query += " AND s.status = ?";
      params.push(status);
    }

    query += " ORDER BY s.date ASC, s.start_time ASC";

    const [schedules] = await db.query(query, params);
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ message: "Error fetching schedules" });
  }
});

// Create new schedule
router.post("/", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const {
      staffId,
      clientId,
      date,
      startTime,
      endTime,
      recurring,
      recurrencePattern,
      notes,
    } = req.body;

    const db = req.app.get("db");

    // Check for schedule conflicts
    const [conflicts] = await db.query(
      `
      SELECT COUNT(*) as count
      FROM schedules
      WHERE staff_id = ?
      AND date = ?
      AND (
        (start_time BETWEEN ? AND ?) OR
        (end_time BETWEEN ? AND ?) OR
        (start_time <= ? AND end_time >= ?)
      )
      AND status != 'cancelled'
    `,
      [
        staffId,
        date,
        startTime,
        endTime,
        startTime,
        endTime,
        startTime,
        endTime,
      ]
    );

    if (conflicts[0].count > 0) {
      return res.status(409).json({ message: "Schedule conflict detected" });
    }

    const [result] = await db.query(
      `
      INSERT INTO schedules (
        staff_id,
        client_id,
        date,
        start_time,
        end_time,
        recurring,
        recurrence_pattern,
        notes,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        staffId,
        clientId,
        date,
        startTime,
        endTime,
        recurring,
        recurrencePattern,
        notes,
        req.user.id,
      ]
    );

    res.status(201).json({
      message: "Schedule created successfully",
      scheduleId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ message: "Error creating schedule" });
  }
});

// Update schedule
router.put("/:id", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      staffId,
      clientId,
      date,
      startTime,
      endTime,
      recurring,
      recurrencePattern,
      status,
      notes,
    } = req.body;

    const db = req.app.get("db");

    // Check for schedule conflicts excluding this schedule
    const [conflicts] = await db.query(
      `
      SELECT COUNT(*) as count
      FROM schedules
      WHERE staff_id = ?
      AND date = ?
      AND id != ?
      AND (
        (start_time BETWEEN ? AND ?) OR
        (end_time BETWEEN ? AND ?) OR
        (start_time <= ? AND end_time >= ?)
      )
      AND status != 'cancelled'
    `,
      [
        staffId,
        date,
        id,
        startTime,
        endTime,
        startTime,
        endTime,
        startTime,
        endTime,
      ]
    );

    if (conflicts[0].count > 0) {
      return res.status(409).json({ message: "Schedule conflict detected" });
    }

    await db.query(
      `
      UPDATE schedules
      SET staff_id = ?,
          client_id = ?,
          date = ?,
          start_time = ?,
          end_time = ?,
          recurring = ?,
          recurrence_pattern = ?,
          status = ?,
          notes = ?
      WHERE id = ?
    `,
      [
        staffId,
        clientId,
        date,
        startTime,
        endTime,
        recurring,
        recurrencePattern,
        status,
        notes,
        id,
      ]
    );

    res.json({ message: "Schedule updated successfully" });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ message: "Error updating schedule" });
  }
});

// Delete schedule
router.delete("/:id", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.get("db");

    await db.query("DELETE FROM schedules WHERE id = ?", [id]);
    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ message: "Error deleting schedule" });
  }
});

// Get staff availability
router.get(
  "/availability/:staffId",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const { staffId } = req.params;
      const { date } = req.query;
      const db = req.app.get("db");

      const [schedules] = await db.query(
        `
      SELECT 
        date,
        start_time,
        end_time,
        status
      FROM schedules
      WHERE staff_id = ?
      AND date = ?
      AND status != 'cancelled'
      ORDER BY start_time
    `,
        [staffId, date]
      );

      res.json(schedules);
    } catch (error) {
      console.error("Error fetching staff availability:", error);
      res.status(500).json({ message: "Error fetching staff availability" });
    }
  }
);

module.exports = router;
