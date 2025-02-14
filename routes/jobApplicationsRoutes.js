const express = require("express");
const router = express.Router();
const multer = require("multer");
const s3Client = require("../config/s3");
// const { PutObjectCommand } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const path = require("path");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const stream = require("stream");
const { promisify } = require("util");
const pipeline = promisify(stream.pipeline);
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Configure S3 client for Vultr
const s3Client = new S3Client({
  endpoint: "https://ewr1.vultrobjects.com",
  region: "ewr1",
  credentials: {
    accessKeyId: process.env.VULTR_ACCESS_KEY,
    secretAccessKey: process.env.VULTR_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
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

      // Store the S3 URL of the uploaded file
      const resumeUrl = req.file ? req.file.location : null;

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
        resumeUrl: resumeUrl,
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

router.post("/apply", upload.single("resume"), async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    console.log("Application data received:", req.body);
    console.log("File data:", req.file);

    let resumeUrl = null;
    if (req.file) {
      const fileKey = `resumes/${Date.now()}-${req.file.originalname}`;
      const command = new PutObjectCommand({
        Bucket: process.env.VULTR_BUCKET_NAME,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3Client.send(command);
      resumeUrl = `https://ewr1.vultrobjects.com/${process.env.VULTR_BUCKET_NAME}/${fileKey}`;
    }

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
        req.body.position_id,
        req.body.first_name,
        req.body.last_name,
        req.body.email,
        req.body.phone,
        resumeUrl,
        req.body.cover_letter,
        "pending",
      ]
    );

    res.status(201).json({
      message: "Application submitted successfully",
      applicationId: result.insertId,
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      message: "Failed to submit application",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;

// Keep the test route for verification
router.post("/test", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error("Test upload error:", err);
      return res.status(400).json({
        error: true,
        message: "File upload error",
        details: err.message,
      });
    }

    try {
      console.log("Test upload successful");
      console.log("File details:", req.file);
      console.log("Form data:", req.body);

      res.status(200).json({
        success: true,
        message: "Test upload successful",
        file: req.file
          ? {
              originalname: req.file.originalname,
              size: req.file.size,
              location: req.file.location,
              mimetype: req.file.mimetype,
            }
          : null,
        body: req.body,
      });
    } catch (error) {
      console.error("Error in test route:", error);
      res.status(500).json({
        error: true,
        message: "Server error",
        details: error.message,
      });
    }
  });
});

router.get("/download/:id", async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const [rows] = await connection.execute(
      "SELECT resume_url FROM job_applications WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length || !rows[0].resume_url) {
      console.log("No resume found for id:", req.params.id);
      return res.status(404).json({ message: "Resume not found" });
    }

    const resumeUrl = rows[0].resume_url;
    console.log("Resume URL:", resumeUrl);

    const command = new GetObjectCommand({
      Bucket: process.env.STACKHERO_BUCKET_NAME,
      Key: resumeUrl, // Use the full URL as the key for now
    });

    const { Body, ContentType, ContentLength } = await s3Client.send(command);

    res.setHeader("Content-Type", ContentType || "application/pdf");
    res.setHeader("Content-Length", ContentLength);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="resume-${req.params.id}${path.extname(resumeUrl)}"`
    );

    Body.pipe(res);
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({
      message: "Error downloading resume",
      error: error.message,
      details: {
        bucket: process.env.STACKHERO_BUCKET_NAME,
        id: req.params.id,
      },
    });
  } finally {
    connection.release();
  }
});

router.get("/", async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const [rows] = await connection.execute(
      "SELECT * FROM job_applications ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Error fetching applications" });
  } finally {
    connection.release();
  }
});

module.exports = router;
