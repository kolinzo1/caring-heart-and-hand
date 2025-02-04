const winston = require("winston");
const path = require("path");

const setupLogging = () => {
  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Create logger instance
  const logger = winston.createLogger({
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
    format: logFormat,
    transports: [
      // Write all logs to console
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
      // Write all logs with level 'error' and below to error.log
      new winston.transports.File({
        filename: path.join(__dirname, "../logs/error.log"),
        level: "error",
      }),
      // Write all logs with level 'info' and below to combined.log
      new winston.transports.File({
        filename: path.join(__dirname, "../logs/combined.log"),
      }),
    ],
  });

  return logger;
};

module.exports = { setupLogging };
