const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

// Get performance metrics for all staff
router.get("/metrics", [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = req.app.get("db");

    const [metrics] = await db.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT tl.id) as total_shifts,
        COUNT(DISTINCT tl.client_id) as unique_clients,
        SUM(tl.duration) as total_minutes,
        COUNT(DISTINCT CASE WHEN tl.status = 'approved' THEN tl.id END) as approved_shifts,
        COUNT(DISTINCT CASE WHEN tl.status = 'rejected' THEN tl.id END) as rejected_shifts,
        AVG(CASE WHEN tl.status = 'approved' THEN tl.duration END) as avg_shift_duration,
        JSON_ARRAYAGG(DISTINCT tl.service_type) as service_types
      FROM users u
      LEFT JOIN time_logs tl ON u.id = tl.user_id
      WHERE u.role = 'staff'
        AND (? IS NULL OR tl.date >= ?)
        AND (? IS NULL OR tl.date <= ?)
      GROUP BY u.id, u.first_name, u.last_name
    `,
      [startDate, startDate, endDate, endDate]
    );

    // Get attendance records
    const [attendance] = await db.query(
      `
      SELECT 
        user_id,
        COUNT(DISTINCT DATE(date)) as days_worked,
        COUNT(DISTINCT CASE 
          WHEN TIMESTAMPDIFF(MINUTE, start_time, end_time) >= 360 
          THEN DATE(date) 
        END) as full_days
      FROM time_logs
      WHERE status = 'approved'
        AND (? IS NULL OR date >= ?)
        AND (? IS NULL OR date <= ?)
      GROUP BY user_id
    `,
      [startDate, startDate, endDate, endDate]
    );

    // Combine metrics with attendance
    const combinedMetrics = metrics.map((staff) => {
      const staffAttendance = attendance.find(
        (a) => a.user_id === staff.id
      ) || {
        days_worked: 0,
        full_days: 0,
      };
      return {
        ...staff,
        ...staffAttendance,
        hours_worked: Math.round((staff.total_minutes || 0) / 60),
        attendance_rate: staffAttendance.days_worked
          ? (
              (staffAttendance.full_days / staffAttendance.days_worked) *
              100
            ).toFixed(1)
          : 0,
        service_types: JSON.parse(staff.service_types || "[]"),
      };
    });

    res.json(combinedMetrics);
  } catch (error) {
    console.error("Error fetching staff metrics:", error);
    res.status(500).json({ message: "Error fetching staff metrics" });
  }
});

// Get individual staff performance details
router.get(
  "/metrics/:userId",
  [authMiddleware, adminMiddleware],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      const db = req.app.get("db");

      // Get detailed metrics
      const [detailedMetrics] = await db.query(
        `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        COUNT(id) as total_shifts,
        SUM(duration) as total_minutes,
        COUNT(DISTINCT client_id) as unique_clients,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'date', date,
            'client_id', client_id,
            'duration', duration,
            'service_type', service_type,
            'status', status
          )
        ) as shift_details
      FROM time_logs
      WHERE user_id = ?
        AND (? IS NULL OR date >= ?)
        AND (? IS NULL OR date <= ?)
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month DESC
    `,
        [userId, startDate, startDate, endDate, endDate]
      );

      // Get client feedback summary
      const [clientFeedback] = await db.query(
        `
      SELECT 
        COUNT(*) as total_reports,
        AVG(CASE WHEN follow_up_needed = 0 THEN 1 ELSE 0 END) * 100 as satisfaction_rate,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'date', sr.created_at,
            'client_condition', sr.client_condition,
            'concerns', sr.concerns
          )
        ) as feedback_details
      FROM shift_reports sr
      JOIN time_logs tl ON sr.shift_id = tl.id
      WHERE tl.user_id = ?
        AND (? IS NULL OR tl.date >= ?)
        AND (? IS NULL OR tl.date <= ?)
    `,
        [userId, startDate, startDate, endDate, endDate]
      );

      res.json({
        monthlyMetrics: detailedMetrics.map((month) => ({
          ...month,
          shift_details: JSON.parse(month.shift_details),
          hours_worked: Math.round(month.total_minutes / 60),
        })),
        feedback: {
          ...clientFeedback[0],
          feedback_details: JSON.parse(
            clientFeedback[0].feedback_details || "[]"
          ),
        },
      });
    } catch (error) {
      console.error("Error fetching staff details:", error);
      res.status(500).json({ message: "Error fetching staff details" });
    }
  }
);

module.exports = router;
