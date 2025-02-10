const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

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

// Validation middleware for team member data
const validateTeamMember = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("role").isIn(["admin", "staff"]).withMessage("Invalid role selected"),
  body("phone")
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage("Invalid phone number format"),
  body("position").optional().trim(),
  body("department").optional().trim(),
  body("qualifications").optional().trim(),
  body("certifications").optional().isArray(),
];

// GET /api/team - Get all team members
router.get("/", auth, async (req, res) => {
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
        u.profile_picture_url,
        sp.position,
        sp.department,
        sp.start_date,
        sp.employee_id,
        sp.qualifications,
        sp.certifications
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.role IN ('admin', 'staff')
      ORDER BY u.created_at DESC
    `);

    // Parse JSON fields
    const teamMembers = rows.map((member) => ({
      ...member,
      certifications: member.certifications
        ? JSON.parse(member.certifications)
        : [],
    }));

    res.json(teamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching team members" });
  }
});

// POST /api/team - Add new team member
router.post("/", [auth, validateTeamMember], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      position,
      department,
      qualifications,
      certifications,
    } = req.body;

    // Create user record
    const [userResult] = await connection.execute(
      "INSERT INTO users (email, password_hash, first_name, last_name, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        email,
        await bcrypt.hash(password, 10),
        firstName,
        lastName,
        role,
        phone,
        "active",
      ]
    );

    // Create staff profile if additional details provided
    if (position || department || qualifications || certifications) {
      await connection.execute(
        "INSERT INTO staff_profiles (user_id, position, department, qualifications, certifications, start_date) VALUES (?, ?, ?, ?, ?, CURDATE())",
        [
          userResult.insertId,
          position,
          department,
          qualifications,
          JSON.stringify(certifications || []),
        ]
      );
    }

    await connection.commit();

    // Fetch the created user with their profile
    const [newMember] = await connection.execute(
      `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.status,
        sp.position,
        sp.department,
        sp.qualifications,
        sp.certifications
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `,
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

// PUT /api/team/:id - Update team member
router.put("/:id", [auth, validateTeamMember], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      firstName,
      lastName,
      email,
      role,
      phone,
      position,
      department,
      qualifications,
      certifications,
    } = req.body;

    // Update user record
    await connection.execute(
      "UPDATE users SET email = ?, first_name = ?, last_name = ?, role = ?, phone = ? WHERE id = ?",
      [email, firstName, lastName, role, phone, req.params.id]
    );

    // Update or create staff profile
    const [existingProfile] = await connection.execute(
      "SELECT id FROM staff_profiles WHERE user_id = ?",
      [req.params.id]
    );

    if (existingProfile.length > 0) {
      await connection.execute(
        "UPDATE staff_profiles SET position = ?, department = ?, qualifications = ?, certifications = ? WHERE user_id = ?",
        [
          position,
          department,
          qualifications,
          JSON.stringify(certifications || []),
          req.params.id,
        ]
      );
    } else {
      await connection.execute(
        "INSERT INTO staff_profiles (user_id, position, department, qualifications, certifications) VALUES (?, ?, ?, ?, ?)",
        [
          req.params.id,
          position,
          department,
          qualifications,
          JSON.stringify(certifications || []),
        ]
      );
    }

    await connection.commit();

    // Fetch updated member
    const [updatedMember] = await connection.execute(
      `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.status,
        sp.position,
        sp.department,
        sp.qualifications,
        sp.certifications
      FROM users u
      LEFT JOIN staff_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `,
      [req.params.id]
    );

    res.json(updatedMember[0]);
  } catch (error) {
    await connection.rollback();
    console.error("Error updating team member:", error);
    res
      .status(500)
      .json({ message: "Server error while updating team member" });
  } finally {
    connection.release();
  }
});

// DELETE /api/team/:id - Delete team member
router.delete("/:id", auth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete staff profile first (due to foreign key constraint)
    await connection.execute("DELETE FROM staff_profiles WHERE user_id = ?", [
      req.params.id,
    ]);

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
