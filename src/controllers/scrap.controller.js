/* eslint-disable consistent-return */
/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-restricted-syntax */
import ScraperService from "../services/scrap.service.js";

export class ScrapingController {
  static async scrapeMedia(req, res, next) {
    try {
      const { urls } = req.body;
      if (!Array.isArray(urls) || urls.length === 0) {
        return res
          .status(400)
          .json({ message: "Please provide an array of URLs." });
      }

      // Collect all scraping promises in an array
      const scrapingPromises = urls.map((url) =>
        ScraperService.addScrapingTask(url)
      );

      // Wait for all scraping tasks to finish
      const results = await Promise.all(scrapingPromises);

      return res.status(200).json({ message: "Scraping started", results });
    } catch (error) {
      next(error);
    }
  }
}
