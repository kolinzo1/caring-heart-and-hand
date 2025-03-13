const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;

    // Log for debugging
    console.log("Auth Header:", authHeader ? "Present" : "Missing");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Invalid authorization header format");
      return res
        .status(401)
        .json({ message: "Authorization header missing or invalid format" });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    if (!token) {
      console.log("Token missing after Bearer prefix");
      return res.status(401).json({ message: "Token is missing" });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified for user:", decoded.id);

    // Add user data to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res
      .status(401)
      .json({ message: "Authentication failed", error: error.message });
  }
};
