const express = require("express");
const router = express.Router();
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const path = require("path");

// Configure S3 client for Vultr Object Storage
const s3Client = new S3Client({
  endpoint: process.env.VULTR_ENDPOINT || "https://ewr1.vultrobjects.com",
  region: "ewr1",
  credentials: {
    accessKeyId: process.env.VULTR_ACCESS_KEY,
    secretAccessKey: process.env.VULTR_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Configure multer with Vultr storage
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.VULTR_BUCKET_NAME,
    acl: "private",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `resumes/${uniqueSuffix}${ext}`);
    },
  }),
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
}).single("resume");

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

router.get("/download/:id", async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    // First, verify the application and get the resume URL
    const [rows] = await connection.execute(
      "SELECT resume_url FROM job_applications WHERE id = ?",
      [req.params.id]
    );

    if (!rows.length || !rows[0].resume_url) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // Get the file key from the resume_url
    const resumeKey = rows[0].resume_url.split("/").pop();

    // Get file from Vultr
    const command = new GetObjectCommand({
      Bucket: process.env.VULTR_BUCKET_NAME,
      Key: `resumes/${resumeKey}`, // Make sure the path matches your upload path
    });

    try {
      const { Body, ContentType, ContentLength } = await s3Client.send(command);

      // Set appropriate headers
      res.setHeader("Content-Type", ContentType || "application/octet-stream");
      res.setHeader("Content-Length", ContentLength);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${resumeKey}"`
      );

      // Stream the file
      Body.pipe(res);
    } catch (s3Error) {
      console.error("S3 Error:", s3Error);
      res.status(500).json({
        message: "Error accessing file storage",
        error: s3Error.message,
      });
    }
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({
      message: "Error downloading resume",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

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

router.get("/", async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const [rows] = await connection.execute(`
        SELECT 
          ja.*,
          jp.title as position_title,
          jp.department
        FROM job_applications ja
        LEFT JOIN job_positions jp ON ja.position_id = jp.id
        ORDER BY ja.created_at DESC
      `);

    const applications = rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      position_id: row.position_id,
      position_title: row.position_title,
      email: row.email,
      phone: row.phone,
      resume_url: row.resume_url,
      cover_letter: row.cover_letter,
      status: row.status || "pending",
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    res.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Error fetching applications" });
  } finally {
    connection.release();
  }
});

module.exports = router;
