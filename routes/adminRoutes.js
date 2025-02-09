const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);
router.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://caring-heart-and-hand-client.vercel.app"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

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

    // Get total revenue (example query)
    const [revenue] = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payments"
    );

    // Send response
    res.json({
      stats: {
        totalClients: parseInt(clientCount[0].count) || 0,
        totalStaff: parseInt(staffCount[0].count) || 0,
        activeRequests: parseInt(requestCount[0].count) || 0,
        totalRevenue: parseFloat(revenue[0].total) || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      message: "Error fetching dashboard data",
    });
  }
});

module.exports = router;
