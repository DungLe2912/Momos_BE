import winston from "winston";
import morgan from "morgan";

// Winston logger configuration
const logger = winston.createLogger({
  level: "info", // Set the log level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(), // Log to console
    new winston.transports.File({ filename: "logs/app.log" }), // Log to a file
  ],
});

// Morgan middleware setup for logging HTTP requests
const loggerMiddleware = morgan("combined", {
  stream: {
    write: (message) => {
      logger.info(message.trim()); // Log each HTTP request
    },
  },
});

export { logger, loggerMiddleware };
