/* eslint-disable consistent-return */
import { AuthService } from "../services/auth.service.js";

export class AuthController {
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
