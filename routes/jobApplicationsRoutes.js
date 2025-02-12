const express = require("express");
const router = express.Router();
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const path = require("path");

// Configure S3 client for Vultr Object Storage
const s3Client = new S3Client({
  endpoint: "https://ewr1.vultrobjects.com", // Replace with your Vultr region
  region: "ewr1", // Replace with your region
  credentials: {
    accessKeyId: process.env.VULTR_ACCESS_KEY,
    secretAccessKey: process.env.VULTR_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Configure multer with Vultr Object Storage
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.VULTR_BUCKET_NAME,
    acl: "private",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const fileName = `resumes/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}${fileExtension}`;
      cb(null, fileName);
    },
  }),
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
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Submit application
router.post("/", upload.single("resume"), async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const { position_id, first_name, last_name, email, phone, cover_letter } =
      req.body;

    await connection.beginTransaction();

    const resumeUrl = req.file ? req.file.location : null; // S3 returns the file URL in location

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
