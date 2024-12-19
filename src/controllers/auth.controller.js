/* eslint-disable consistent-return */
import { AuthService } from "../services/auth.service.js";
import { logger } from "../middlewares/logger.middleware.js";

export class AuthController {
  static async signup(req, res, next) {
    try {
      const { email, password, fullName } = req.body;

      // Validate input
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      // Password strength validation
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Create account
      const result = await AuthService.signup({
        email,
        password,
        fullName,
      });

      // Return success response
      return res.status(201).json({
        success: true,
        message: "Account created successfully",
        data: {
          id: result.id,
          email: result.email,
          fullName: result.fullName,
          createdAt: result.createdAt,
        },
      });
    } catch (error) {
      logger.error("Signup failed:", JSON.stringify(error, null, 2));
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const data = await AuthService.login(req.body);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {}

  static async refreshToken(req, res, next) {
    const { userId, refreshToken } = req.body;
    try {
      const data = await AuthService.refreshToken(userId, refreshToken);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}
