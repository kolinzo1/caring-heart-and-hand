const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Get shift report
router.get("/:shiftId", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const userId = req.user.id;

    // First verify the shift belongs to this user
    const [shifts] = await req.app.get("db").query(
      `SELECT s.*, c.first_name, c.last_name 
       FROM shifts s
       JOIN clients c ON s.client_id = c.id
       WHERE s.id = ? AND s.user_id = ?`,
      [shiftId, userId]
    );

    if (shifts.length === 0) {
      return res.status(404).json({ message: "Shift not found" });
    }

    // Get the report if it exists
    const [reports] = await req.app
      .get("db")
      .query("SELECT * FROM shift_reports WHERE shift_id = ?", [shiftId]);

    const response = {
      shift: {
        ...shifts[0],
        clientName: `${shifts[0].first_name} ${shifts[0].last_name}`,
      },
      report: reports[0] || null,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching shift report:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit shift report
router.post("/:shiftId/report", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const userId = req.user.id;
    const { tasksCompleted, clientCondition, notes, concerns, followUpNeeded } =
      req.body;

    // Verify shift belongs to user
    const [shifts] = await req.app
      .get("db")
      .query("SELECT id FROM shifts WHERE id = ? AND user_id = ?", [
        shiftId,
        userId,
      ]);

    if (shifts.length === 0) {
      return res.status(404).json({ message: "Shift not found" });
    }

    // Insert or update report
    const [existingReport] = await req.app
      .get("db")
      .query("SELECT id FROM shift_reports WHERE shift_id = ?", [shiftId]);

    if (existingReport.length > 0) {
      await req.app.get("db").query(
        `UPDATE shift_reports 
         SET tasks_completed = ?, client_condition = ?, notes = ?, 
             concerns = ?, follow_up_needed = ?
         WHERE shift_id = ?`,
        [
          JSON.stringify(tasksCompleted),
          clientCondition,
          notes,
          concerns,
          followUpNeeded,
          shiftId,
        ]
      );
    } else {
      await req.app.get("db").query(
        `INSERT INTO shift_reports 
         (shift_id, tasks_completed, client_condition, notes, concerns, follow_up_needed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          shiftId,
          JSON.stringify(tasksCompleted),
          clientCondition,
          notes,
          concerns,
          followUpNeeded,
        ]
      );
    }

    res.json({ message: "Report submitted successfully" });
  } catch (error) {
    console.error("Error submitting shift report:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
