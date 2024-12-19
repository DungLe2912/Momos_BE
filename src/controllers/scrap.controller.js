/* eslint-disable consistent-return */
/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-restricted-syntax */
import ScraperService from "../services/scrap.service.js";
import { logger } from "../middlewares/logger.middleware.js";

export class ScrapingController {
  static async scrapeMedia(req, res, next) {
    try {
      const { urls } = req.body;
      const accountId = req.user.id; // Assuming from auth middleware

      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          message: "Please provide an array of URLs.",
        });
      }

      if (urls.length > 5000) {
        return res.status(400).json({
          message: "Maximum 5000 URLs allowed per request.",
        });
      }

      const result = await ScraperService.addScrapingTask(urls, accountId);

      return res.status(200).json({
        message: "Scraping tasks created successfully",
        ...result,
      });
    } catch (error) {
      logger.error("Scraping request failed:", error);
      next(error);
    }
  }

  static async getResults(req, res, next) {
    try {
      const { jobIds, urls, page = 1, limit = 50, status } = req.query;
      const accountId = req.user.id;

      const results = await ScraperService.getScrapingResults({
        jobIds: jobIds?.split(","),
        urls: urls?.split(","),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status,
        accountId,
      });

      return res.status(200).json(results);
    } catch (error) {
      logger.error("Failed to get scraping results:", error);
      next(error);
    }
  }

  static async getJobStatus(req, res, next) {
    try {
      const { jobIds } = req.params;
      const accountId = req.user.id;

      if (!jobIds) {
        return res.status(400).json({
          message: "Job IDs are required",
        });
      }

      const status = await ScraperService.getJobsStatus(
        jobIds.split(","),
        accountId
      );

      return res.status(200).json(status);
    } catch (error) {
      logger.error("Failed to get job status:", error);
      next(error);
    }
  }

  static async getStats(req, res, next) {
    try {
      const accountId = req.user.id;
      const stats = await ScraperService.getScrapingStats(accountId);
      return res.status(200).json(stats);
    } catch (error) {
      logger.error("Failed to get scraping stats:", error);
      next(error);
    }
  }
}
