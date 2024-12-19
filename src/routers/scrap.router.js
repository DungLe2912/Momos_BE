import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { ScrapingController } from "../controllers/scrap.controller.js";

export const scrapingRouter = express.Router();

scrapingRouter.use(authenticateToken);

scrapingRouter.post("/scrape-media", ScrapingController.scrapeMedia);
scrapingRouter.get("/results", ScrapingController.getResults);
scrapingRouter.get("/status/:jobIds", ScrapingController.getJobStatus);
scrapingRouter.get("/stats", ScrapingController.getStats);
