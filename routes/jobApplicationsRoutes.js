const express = require("express");
const router = express.Router();
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const path = require("path");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// Submit application
router.post("/", upload.single('resume'), async (req, res) => {
  const connection = await req.app.get("db").getConnection();
  try {
    const {
      position_id,
      first_name,
      last_name,
      email,
      phone,
      cover_letter,
    } = req.body;

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
        'pending'
      ]
    );

    await connection.commit();