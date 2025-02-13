require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mysql = require("mysql2/promise");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "uploads/resumes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const corsOptions = {
  origin: ["https://caring-heart-and-hand-client.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};
// Initialize logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Add console logging if not in production

const app = express();

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(
  cors({
    origin: "https://caring-heart-and-hand-client.vercel.app",
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

app.set("trust proxy", 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Add preflight handling
app.options("*", cors(corsOptions));

// Apply rate limiter to all routes
app.use(limiter);

app.get("/", (req, res) => {
  res.json({ message: "Server running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Add logging
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://caring-heart-and-hand-client.vercel.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).json({
      status: "success",
    });
  }

  next();
});

// Compression middleware - add this before other middleware
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Security Middleware
app.use(helmet());

// Configure CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);

// Additional security headers
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());

// CORS configuration
app.use(cors(corsOptions));

app.use(express.json());

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "healthy",
      timestamp: new Date(),
      uptime: process.uptime(),
      database: "connected",
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date(),
      database: "disconnected",
    });
  }
});
// test endpoints
app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

// Database connection check
const testConnection = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Database connected");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
};

testConnection();

// test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    console.log("Test DB endpoint hit");
    const [result] = await pool.query("SELECT 1");
    console.log("Query result:", result);
    res.json({ status: "success", data: result });
  } catch (error) {
    console.error("DB Test Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Make db available to routes
app.set("db", pool);

// Add this debugging line
console.log(
  "Available routes:",
  app._router.stack.map((r) => r.route?.path).filter(Boolean)
);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  next();
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/shifts", require("./routes/shifts"));
app.use("/api/clients", require("./routes/clientRoutes"));
app.use("/api/time-logs", require("./routes/timeLogRoutes"));
app.use("/api/shift-reports", require("./routes/shiftReportRoutes"));
app.use("/api/staff", require("./routes/staffRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/blog", require("./routes/blogRoutes"));
app.use("/api/schedules", require("./routes/scheduleRoutes"));
app.use("/api/admin/staff", require("./routes/staffMetricsRoutes"));
app.use("/api/admin/team", require("./routes/teamMemberRoutes"));
app.use("/careers/positions", require("./routes/jobPositionsRoutes"));
app.use("/careers/apply", require("./routes/jobApplicationsRoutes"));
app.use("/careers/applications", require("./routes/jobApplicationsRoutes"));

// Debug logs
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);

  // Log detailed error for debugging
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
    requestId: req.id, // Useful for tracking errors
  });
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");

  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      // Close database connection pool
      await pool.end();
      logger.info("Database connections closed");

      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown:", err);
      process.exit(1);
    }
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  // Perform graceful shutdown
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Perform graceful shutdown
  process.exit(1);
});

pool
  .query("SELECT 1")
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });
