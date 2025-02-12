const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

// Get all job positions
router.get("/", async (req, res) => {
  try {
    const [rows] = await req.app
      .get("db")
      .query(`SELECT * FROM job_positions ORDER BY created_at DESC`);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching job positions:", error);
    res.status(500).json({ message: "Error fetching job positions" });
  }
});

// Get single job position
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.app
      .get("db")
      .query(`SELECT * FROM job_positions WHERE id = ?`, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Position not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching job position:", error);
    res.status(500).json({ message: "Error fetching job position" });
  }
});

// Create job position (admin only)
router.post("/", [authMiddleware, adminMiddleware], async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const {
      title,
      department,
      employmentType,
      location,
      salary,
      description,
      requirements,
      benefits,
      isActive,
    } = req.body;

    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO job_positions (
        title,
        department,
        employment_type,
        location,
        salary,
        description,
        requirements,
        benefits,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        department,
        employmentType,
        location,
        salary,
        description,
        JSON.stringify(requirements),
        JSON.stringify(benefits),
        isActive ? 1 : 0,
      ]
    );

    await connection.commit();

    const [newPosition] = await connection.execute(
      `SELECT * FROM job_positions WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(newPosition[0]);
  } catch (error) {
    await connection.rollback();
    console.error("Error creating job position:", error);
    res.status(500).json({ message: "Error creating job position" });
  } finally {
    connection.release();
  }
});

// Update job position (admin only)
router.put("/:id", [authMiddleware, adminMiddleware], async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const {
      title,
      department,
      employmentType,
      location,
      salary,
      description,
      requirements,
      benefits,
      isActive,
    } = req.body;

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE job_positions SET
        title = ?,
        department = ?,
        employment_type = ?,
        location = ?,
        salary = ?,
        description = ?,
        requirements = ?,
        benefits = ?,
        is_active = ?
      WHERE id = ?`,
      [
        title,
        department,
        employmentType,
        location,
        salary,
        description,
        JSON.stringify(requirements),
        JSON.stringify(benefits),
        isActive ? 1 : 0,
        req.params.id,
      ]
    );

    await connection.commit();

    const [updatedPosition] = await connection.execute(
      `SELECT * FROM job_positions WHERE id = ?`,
      [req.params.id]
    );

    res.json(updatedPosition[0]);
  } catch (error) {
    await connection.rollback();
    console.error("Error updating job position:", error);
    res.status(500).json({ message: "Error updating job position" });
  } finally {
    connection.release();
  }
});

// Delete job position (admin only)
router.delete("/:id", [authMiddleware, adminMiddleware], async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(`DELETE FROM job_positions WHERE id = ?`, [
      req.params.id,
    ]);

    await connection.commit();
    res.json({ message: "Position deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting job position:", error);
    res.status(500).json({ message: "Error deleting job position" });
  } finally {
    connection.release();
  }
});

module.exports = router;
