const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { authMiddleware } = require("../middleware/authMiddleware");

// Change Password Route
router.post("/change-password", authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
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

// Change Password Route
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user's password hash
    const [users] = await req.app
      .get("db")
      .query("SELECT password_hash FROM users WHERE id = ?", [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      users[0].password_hash
    );
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await req.app
      .get("db")
      .query("UPDATE users SET password_hash = ? WHERE id = ?", [
        newPasswordHash,
        userId,
      ]);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Error changing password" });
  }
});

module.exports = router;
