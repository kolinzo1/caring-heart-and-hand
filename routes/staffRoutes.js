const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { authMiddleware } = require("../middleware/authMiddleware");

// Get staff profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await req.app.get("db").query(
      `SELECT u.*, 
              s.position, s.department, s.start_date, s.employee_id,
              s.qualifications, s.certifications
       FROM users u
       LEFT JOIN staff_profiles s ON u.id = s.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const profile = {
      personalInfo: {
        firstName: rows[0].first_name,
        lastName: rows[0].last_name,
        email: rows[0].email,
        phone: rows[0].phone || "",
        address: rows[0].address || "",
        profilePicture: rows[0].profile_picture_url,
        emergencyContact: JSON.parse(rows[0].emergency_contact || "{}"),
      },
      professionalInfo: {
        position: rows[0].position || "",
        department: rows[0].department || "",
        startDate: rows[0].start_date,
        employeeId: rows[0].employee_id,
        qualifications: rows[0].qualifications || "",
        certifications: JSON.parse(rows[0].certifications || "[]"),
      },
    };

    res.json(profile);
  } catch (error) {
    console.error("Error fetching staff profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// Update staff profile
router.put("/profile", authMiddleware, async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const userId = req.user.id;
    const { personalInfo, professionalInfo } = req.body;

    await connection.beginTransaction();

    // Update user table
    await connection.execute(
      `UPDATE users 
       SET first_name = ?, 
           last_name = ?, 
           phone = ?, 
           address = ?,
           emergency_contact = ?
       WHERE id = ?`,
      [
        personalInfo.firstName,
        personalInfo.lastName,
        personalInfo.phone,
        personalInfo.address,
        JSON.stringify(personalInfo.emergencyContact),
        userId,
      ]
    );

    // Update or insert staff_profiles
    await connection.execute(
      `INSERT INTO staff_profiles 
       (user_id, position, department, start_date, qualifications, certifications)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       position = VALUES(position),
       department = VALUES(department),
       start_date = VALUES(start_date),
       qualifications = VALUES(qualifications),
       certifications = VALUES(certifications)`,
      [
        userId,
        professionalInfo.position,
        professionalInfo.department,
        professionalInfo.startDate,
        professionalInfo.qualifications,
        JSON.stringify(professionalInfo.certifications),
      ]
    );

    await connection.commit();
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating staff profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  } finally {
    connection.release();
  }
});

// Get staff dashboard data
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

// Change Password Route
router.post("/change-password", authMiddleware, async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user
    const [users] = await connection.execute(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await connection.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, userId]
    );

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Error changing password" });
  } finally {
    connection.release();
  }
});

module.exports = router;
