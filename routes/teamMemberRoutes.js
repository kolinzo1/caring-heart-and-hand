const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { authMiddleware } = require("../middleware/authMiddleware");

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Validation middleware
const validateTeamMember = [
  body("first_name").trim().notEmpty().withMessage("First name is required"),
  body("last_name").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("role").isIn(["admin", "staff"]).withMessage("Invalid role selected"),
  body("phone")
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage("Invalid phone number format"),
];

// Routes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.status,
        u.profile_picture_url
      FROM users u
      WHERE u.role IN ('admin', 'staff')
      ORDER BY u.created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching team members" });
  }
});

router.post("/", [authMiddleware, ...validateTeamMember], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { first_name, last_name, email, password, role, phone } = req.body;

    const [userResult] = await connection.execute(
      "INSERT INTO users (email, password_hash, first_name, last_name, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        email,
        await bcrypt.hash(password, 10),
        first_name,
        last_name,
        role,
        phone,
        "active",
      ]
    );

    await connection.commit();

    const [newMember] = await connection.execute(
      `SELECT id, email, first_name, last_name, role, phone, status
       FROM users WHERE id = ?`,
      [userResult.insertId]
    );

    res.status(201).json(newMember[0]);
  } catch (error) {
    await connection.rollback();
    console.error("Error creating team member:", error);
    res
      .status(500)
      .json({ message: "Server error while creating team member" });
  } finally {
    connection.release();
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete user record
    await connection.execute("DELETE FROM users WHERE id = ?", [req.params.id]);

    await connection.commit();
    res.json({ message: "Team member deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting team member:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting team member" });
  } finally {
    connection.release();
  }
});

module.exports = router;
