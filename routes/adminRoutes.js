const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard stats
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

    // Get active care requests
    const [requestCount] = await db.query(
      "SELECT COUNT(*) as count FROM care_requests WHERE status = 'pending'"
    );

    // Get total revenue
    const [revenue] = await db.query(
      `SELECT SUM(amount) as total FROM payments 
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE())`
    );

    // Get recent care requests
    const [careRequests] = await db.query(
      `SELECT cr.*, c.first_name, c.last_name
       FROM care_requests cr
       JOIN clients c ON cr.client_id = c.id
       ORDER BY cr.created_at DESC
       LIMIT 5`
    );

    // Get recent staff members
    const [staffMembers] = await db.query(
      `SELECT u.*, sp.* 
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.role = 'staff'
       ORDER BY u.created_at DESC
       LIMIT 5`
    );

    res.json({
      stats: {
        totalClients: clientCount[0].count,
        totalStaff: staffCount[0].count,
        activeRequests: requestCount[0].count,
        totalRevenue: revenue[0].total || 0,
      },
      careRequests,
      staffMembers,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
});

// Team management routes
router.get("/team", async (req, res) => {
  try {
    const [staff] = await req.app.get("db").query(
      `SELECT u.*, sp.*
       FROM users u
       LEFT JOIN staff_profiles sp ON u.id = sp.user_id
       WHERE u.role = 'staff'
       ORDER BY u.created_at DESC`
    );
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: "Error fetching team data" });
  }
});

// Job positions routes
router.get("/positions", async (req, res) => {
  try {
    const [positions] = await req.app
      .get("db")
      .query("SELECT * FROM job_positions ORDER BY created_at DESC");
    res.json(positions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching positions" });
  }
});

// Applications management routes
router.get("/applications", async (req, res) => {
  try {
    const [applications] = await req.app.get("db").query(
      `SELECT ja.*, jp.title as position_title
       FROM job_applications ja
       JOIN job_positions jp ON ja.position_id = jp.id
       ORDER BY ja.created_at DESC`
    );
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching applications" });
  }
});

// Settings routes
router.get("/settings", async (req, res) => {
  try {
    const [settings] = await req.app
      .get("db")
      .query("SELECT * FROM system_settings WHERE id = 1");
    res.json(settings[0]);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    await req.app
      .get("db")
      .query("UPDATE system_settings SET ? WHERE id = 1", [req.body]);
    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating settings" });
  }
});

module.exports = router;
