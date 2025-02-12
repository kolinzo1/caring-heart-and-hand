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
    try {
      const allowedTypes = [".pdf", ".doc", ".docx"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only PDF and Word documents are allowed."
          )
        );
      }
    } catch (error) {
      cb(error);
    }
  },
}).single("resume");

// Test route with explicit error handling
router.post("/test", (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      return res.status(400).json({
        error: true,
        message: "File upload error",
        details: err.message,
      });
    } else if (err) {
      console.error("Unknown error:", err);
      return res.status(500).json({
        error: true,
        message: "Error processing request",
        details: err.message,
      });
    }

    try {
      console.log("Request body:", req.body);
      console.log("File details:", req.file);

      // Send successful response
      return res.status(200).json({
        success: true,
        message: "Test upload successful",
        file: req.file
          ? {
              originalname: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype,
            }
          : null,
        body: req.body,
      });
    } catch (error) {
      console.error("Error in test route:", error);
      return res.status(500).json({
        error: true,
        message: "Server error processing request",
        details: error.message,
      });
    }
  });
});

// Submit application route
router.post("/", (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({
        error: true,
        message: err.message,
      });
    }

    let connection;
    try {
      connection = await req.app.get("db").getConnection();

      const { position_id, first_name, last_name, email, phone, cover_letter } =
        req.body;

      await connection.beginTransaction();

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
        success: true,
        message: "Application submitted successfully",
        applicationId: result.insertId,
      });
    } catch (error) {
      console.error("Database error:", error);
      if (connection) {
        await connection.rollback();
      }
      res.status(500).json({
        error: true,
        message: "Error submitting application",
        details: error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });
});

module.exports = router;
