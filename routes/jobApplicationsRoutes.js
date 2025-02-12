const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Use memory storage for now
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only PDF and Word documents are allowed.")
      );
    }
  },
});

// Test route to verify file uploads
router.post("/test", upload.single("resume"), (req, res) => {
  try {
    console.log("File received:", req.file);
    console.log("Form data:", req.body);

    res.json({
      message: "Test upload successful",
      file: {
        originalname: req.file?.originalname,
        size: req.file?.size,
        mimetype: req.file?.mimetype,
      },
      body: req.body,
    });
  } catch (error) {
    console.error("Test upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Submit application
router.post("/", upload.single("resume"), async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const { position_id, first_name, last_name, email, phone, cover_letter } =
      req.body;

    await connection.beginTransaction();

    // For now, just store the filename
    const resumeUrl = req.file ? `temp_${req.file.originalname}` : null;

    const [result] = await connection.execute(
      `INSERT INTO job_applications (
        position_id,
        first_name,
        last_name,
        email,
        phone,
        resume_url,
        cover_letter,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        position_id,
        first_name,
        last_name,
        email,
        phone,
        resumeUrl,
        cover_letter,
        "pending",
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Application submitted successfully",
      applicationId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error submitting application:", error);
    res.status(500).json({ message: "Error submitting application" });
  } finally {
    connection.release();
  }
});

module.exports = router;
