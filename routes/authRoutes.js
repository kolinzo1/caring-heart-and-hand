const express = require("express");
const router = express.Router();
const { authMiddleware, validateRequest } = require("../middleware");
const { check } = require("express-validator");

// Validation middleware
const registerValidation = [
  check("firstName", "First name is required").notEmpty(),
  check("lastName", "Last name is required").notEmpty(),
  check("email", "Please include a valid email").isEmail(),
  check(
    "password",
    "Please enter a password with 6 or more characters"
  ).isLength({ min: 6 }),
  check("phone", "Phone number is required").notEmpty(),
];

const loginValidation = [
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
];

// Routes
router.post(
  "/register",
  registerValidation,
  validateRequest,
  async (req, res) => {
    // Registration logic here
    res.status(200).json({ message: "Registration endpoint" });
  }
);

router.post("/login", loginValidation, validateRequest, async (req, res) => {
  // Login logic here
  res.status(200).json({ message: "Login endpoint" });
});

router.post("/logout", authMiddleware, async (req, res) => {
  // Logout logic here
  res.status(200).json({ message: "Logout endpoint" });
});

router.post("/forgot-password", async (req, res) => {
  // Forgot password logic here
  res.status(200).json({ message: "Forgot password endpoint" });
});

router.post("/reset-password", async (req, res) => {
  // Reset password logic here
  res.status(200).json({ message: "Reset password endpoint" });
});

module.exports = router;
