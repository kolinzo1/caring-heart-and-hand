const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const securityMiddleware = {
  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  }),

  adminRateLimiter: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 500, // limit each IP to 500 requests per windowMs
    message: "Too many admin requests from this IP, please try again later.",
  }),

  setupSecurity: (app) => {
    // Basic security headers
    app.use(helmet());

    // Content Security Policy
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
        },
      })
    );

    // Session configuration
    app.use(
      session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      })
    );
  },
};
