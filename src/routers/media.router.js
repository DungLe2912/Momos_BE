import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { MediaController } from "../controllers/media.controller.js";

export const mediaRouter = express.Router();

mediaRouter.use(authenticateToken);

mediaRouter.get("/all", MediaController.getAllMedia);
