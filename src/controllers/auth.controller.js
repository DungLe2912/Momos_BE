import { AuthService } from "../services/auth.service.js";

export class AuthController {
  static async login(req, res) {
    try {
      const data = await AuthService.login(req.body);
      return res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: "Login failed", error: error.message });
    }
  }

  static async logout(req, res) {}

  static async refreshToken(req, res) {
    const { userId, refreshToken } = req.body;
    try {
      const data = await AuthService.refreshToken(userId, refreshToken);
      return res.status(200).json(data);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Get new tokens failed", error: error.message });
    }
  }
}
