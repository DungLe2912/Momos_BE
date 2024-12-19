/* eslint-disable consistent-return */
import { MediaService } from "../services/media.service.js";
import { logger } from "../middlewares/logger.middleware.js";

export class MediaController {
  static async getAllMedia(req, res, next) {
    try {
      const accountId = req.user.id;
      const {
        page = 1,
        limit = 50,
        type, // 'image' or 'video'
        sortBy = "createdAt",
        sortOrder = "DESC",
        search,
        startDate,
        endDate,
      } = req.query;

      const results = await MediaService.getAllMediaByAccount({
        accountId,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        type,
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
        search,
        startDate,
        endDate,
      });

      return res.status(200).json(results);
    } catch (error) {
      logger.error("Failed to get media:", error);
      next(error);
    }
  }
}
