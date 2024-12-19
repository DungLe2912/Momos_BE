import express from "express";
import { rateLimiter, validateSignup } from "../middlewares/index.js";
import { AuthController } from "../controllers/auth.controller.js";

export const authRouter = express.Router();

authRouter.post(
  "/signup",
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 requests per 15 minutes
  validateSignup,
  AuthController.signup
);

authRouter.post("/login", AuthController.login);

authRouter.post("/logout", AuthController.logout);

authRouter.post("/refresh", AuthController.refreshToken);
