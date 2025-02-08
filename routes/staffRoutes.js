const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get assigned clients count
    const [clientsCount] = await req.app
      .get("db")
      .query(
        "SELECT COUNT(DISTINCT client_id) as count FROM time_logs WHERE user_id = ?",
        [userId]
      );

    // Get today's shifts count
    const [todayShifts] = await req.app
      .get("db")
      .query(
        "SELECT COUNT(*) as count FROM time_logs WHERE user_id = ? AND DATE(date) = CURDATE()",
        [userId]
      );

    // Get pending reports count
    const [pendingReports] = await req.app.get("db").query(
      `SELECT COUNT(*) as count 
       FROM time_logs tl
       LEFT JOIN shift_reports sr ON tl.id = sr.shift_id
       WHERE tl.user_id = ? AND sr.id IS NULL`,
      [userId]
    );

    res.json({
      assignedClients: clientsCount[0].count,
      todayShifts: todayShifts[0].count,
      pendingReports: pendingReports[0].count,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
});

module.exports = router;
