import { hash, compare, genSalt } from "bcrypt";
import jwt from "jsonwebtoken";

import { logger } from "../middlewares/logger.middleware.js";
import db from "../database/index.js";

const { sign } = jwt;

export class AuthService {
  static async #hashPassword(password) {
    const saltRounds = 10;
    return hash(password, saltRounds);
  }

  static async #comparePassword(password, hashedPassword) {
    return compare(password, hashedPassword);
  }

  static async #generateToken(user, tokenSecretKey, expiresIn) {
    return sign(user, tokenSecretKey, {
      algorithm: "HS256",
      expiresIn,
    });
  }

  static async login(account) {
    const { email, password } = account;
    const user = await db.models.accounts.findOne({ where: { email } });
    if (!user) throw new Error("User not found");
    const isValidPassword = await this.#comparePassword(
      password,
      user.password
    );
    if (!isValidPassword) throw new Error("Invalid email or password");
    const accessTokenSecret = `${process.env.ACCESS_SECRET_KEY}`;
    const refreshTokenSecret = `${process.env.REFRESH_SECRET_KEY}`;
    const accessToken = await this.#generateToken(
      {
        id: user.id,
        email: user.email,
      },
      accessTokenSecret,
      "10m"
    );
    const refreshToken = await this.#generateToken(
      {
        id: user.id,
        email: user.email,
      },
      refreshTokenSecret,
      "7d"
    );
    return {
      user,
      tokens: { accessToken, refreshToken },
    };
  }

  static async refreshToken(userId, refreshToken) {
    const user = await db.models.accounts.findByPk(userId);
    if (!user) throw new Error("User not found");
    try {
      jwt.verify(refreshToken, "" + process.env.REFRESH_SECRET_KEY, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
    const newAccessToken = await this.#generateToken(
      {
        id: user.id,
        email: user.email,
      },
      process.env.ACCESS_SECRET_KEY,
      "10m"
    );
    const newRefreshToken = await this.#generateToken(
      {
        id: user.id,
        email: user.email,
      },
      process.env.REFRESH_SECRET_KEY,
      "7d"
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async signup({ email, password, fullName }) {
    // Check if email already exists
    const existingUser = await db.models.accounts.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Hash password
    const salt = await genSalt(10);
    const hashedPassword = await hash(password, salt);

    // Create account
    const account = await db.models.accounts.create({
      email,
      password: hashedPassword,
      userName: fullName || null,
    });

    logger.info(`New account created: ${account.id}`);

    return account;
  }
}
