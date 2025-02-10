const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

// Admin Routes
router.get("/admin", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      staffId,
      clientId,
      status,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        tl.*,
        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
        CONCAT(c.first_name, ' ', c.last_name) as client_name
      FROM time_logs tl
      JOIN users s ON tl.user_id = s.id
      JOIN clients c ON tl.client_id = c.id
      WHERE 1=1
    `;

    const queryParams = [];

    if (startDate) {
      query += " AND DATE(tl.date) >= ?";
      queryParams.push(startDate);
    }

    if (endDate) {
      query += " AND DATE(tl.date) <= ?";
      queryParams.push(endDate);
    }

    if (staffId) {
      query += " AND tl.user_id = ?";
      queryParams.push(staffId);
    }

    if (clientId) {
      query += " AND tl.client_id = ?";
      queryParams.push(clientId);
    }

    if (status && status !== "all") {
      query += " AND tl.status = ?";
      queryParams.push(status);
    }

    query += " ORDER BY tl.date DESC, tl.start_time DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), offset);

    const [logs] = await req.app.get("db").query(query, queryParams);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching time logs:", error);
    res.status(500).json({ message: "Error fetching time logs" });
  }
});

router.get(
  "/admin/export",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const query = `
      SELECT 
        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
        tl.date,
        tl.start_time,
        tl.end_time,
        tl.duration,
        tl.service_type,
        tl.status,
        tl.notes
      FROM time_logs tl
      JOIN users s ON tl.user_id = s.id
      JOIN clients c ON tl.client_id = c.id
      WHERE DATE(tl.date) BETWEEN ? AND ?
      ORDER BY tl.date DESC, tl.start_time DESC
    `;

      const [logs] = await req.app.get("db").query(query, [startDate, endDate]);

      // Convert to CSV
      const fields = [
        "staff_name",
        "client_name",
        "date",
        "start_time",
        "end_time",
        "duration",
        "service_type",
        "status",
        "notes",
      ];
      const csv = [
        fields.join(","), // Header
        ...logs.map((log) =>
          fields.map((field) => `"${log[field] || ""}"`).join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=time-logs-${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      res.send(csv);
    } catch (error) {
      console.error("Error exporting time logs:", error);
      res.status(500).json({ message: "Error exporting time logs" });
    }
  }
);

// Update time log status (admin only)
router.patch(
  "/admin/:id/status",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const { status } = req.body;
      const { id } = req.params;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await req.app
        .get("db")
        .query("UPDATE time_logs SET status = ? WHERE id = ?", [status, id]);

      res.json({ message: "Time log status updated successfully" });
    } catch (error) {
      console.error("Error updating time log status:", error);
      res.status(500).json({ message: "Error updating time log status" });
    }
  }
);

// [Your existing routes below...]

// Create time log
router.post("/", authMiddleware, async (req, res) => {
  // Your existing code
});

// Test route without auth
router.get("/test", (req, res) => {
  // Your existing code
});

// Get time logs for user
router.get("/", authMiddleware, async (req, res) => {
  // Your existing code
});

// Get recent time logs for user
router.get("/recent", authMiddleware, async (req, res) => {
  // Your existing code
});

// Get single time log with client details
router.get("/:id", authMiddleware, async (req, res) => {
  // Your existing code
});

router.post("/:id/report", authMiddleware, async (req, res) => {
  // Your existing code
});

module.exports = router;
