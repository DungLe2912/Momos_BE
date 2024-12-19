import rateLimit from "express-rate-limit";

export const rateLimiter = ({ windowMs, max }) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
