const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validateRequest } = require("../middleware");
const { check } = require("express-validator");

const loginValidation = [
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
];

router.post("/login", loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await req.app
      .get("db")
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];
    const validPassword = await bcryptjs.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create token with id instead of userId to match frontend expectations
    const token = jwt.sign(
      { id: user.id, role: user.role }, // Change userId to id
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Send user data along with token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        // Add any other user fields you need, but remove sensitive data like password_hash
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
