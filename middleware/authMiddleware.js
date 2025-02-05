const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    let token;
    console.log("Headers:", req.headers); // Debug log

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token found:", token); // Debug log
    }

    if (!token) {
      console.log("No token provided"); // Debug log
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded); // Debug log

      // Add user info to request
      req.user = decoded;
      next();
    } catch (err) {
      console.error("Token verification failed:", err); // Debug log
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error); // Debug log
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "User role not authorized",
      });
    }
    next();
  };
};

module.exports = { authMiddleware, authorize };
