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
  body("password").notEmpty().withMessage("Password is required"),
];

// POST new team member
router.post("/", [authMiddleware, ...validateTeamMember], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      first_name,
      last_name,
      email,
      password,
      role,
      phone = null, // Default to null if not provided
    } = req.body;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Log the values being inserted
      console.log("Inserting user with values:", {
        email,
        first_name,
        last_name,
        role,
        phone,
      });

      const [userResult] = await connection.execute(
        `INSERT INTO users 
        (email, password_hash, first_name, last_name, role, phone, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

      // Fetch the created user
      const [newMember] = await connection.execute(
        `SELECT id, email, first_name, last_name, role, phone, status
         FROM users WHERE id = ?`,
        [userResult.insertId]
      );

      res.status(201).json(newMember[0]);
    } catch (error) {
      await connection.rollback();
      console.error("Database error:", error);
      res.status(500).json({
        message: "Server error while creating team member",
        details: error.message,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({
      message: "Server error",
      details: error.message,
    });
  }
});

// GET all team members
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, email, first_name, last_name, role, phone, status
      FROM users
      WHERE role IN ('admin', 'staff')
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching team members" });
  }
});

// DELETE team member
router.delete("/:id", authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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
