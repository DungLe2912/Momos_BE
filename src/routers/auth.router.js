import express from "express";
import { AuthController } from "../controllers/auth.controller.js";

export const authRouter = express.Router();

authRouter.post("/login", AuthController.login);

authRouter.post("/logout", AuthController.logout);

authRouter.post("/refresh", AuthController.refreshToken);
