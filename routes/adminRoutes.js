const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard data endpoint
router.get("/dashboard", async (req, res) => {
  try {
    const db = req.app.get("db");

    // Get total clients
    const [clientCount] = await db.query(
      "SELECT COUNT(*) as count FROM clients"
    );

    // Get total staff
    const [staffCount] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'staff'"
    );

    // Get active requests
    const [requestCount] = await db.query(
      "SELECT COUNT(*) as count FROM care_requests WHERE status = 'pending'"
    );

    // Get total revenue
    const [revenue] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments 
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE())`
    );

    res.json({
      stats: {
        totalClients: clientCount[0].count || 0,
        totalStaff: staffCount[0].count || 0,
        activeRequests: requestCount[0].count || 0,
        totalRevenue: revenue[0].total || 0,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
});

module.exports = router;
