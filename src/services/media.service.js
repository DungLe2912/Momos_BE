import { Op } from "sequelize";
import { logger } from "../middlewares/logger.middleware.js";

import db from "../database/index.js";

export class MediaService {
  static async getAllMediaByAccount({
    accountId,
    page = 1,
    limit = 50,
    type,
    sortBy = "createdAt",
    sortOrder = "DESC",
    search,
    startDate,
    endDate,
  }) {
    try {
      // Build base where clause
      const where = { accountId };

      // Filter by media type
      if (type && ["image", "video"].includes(type)) {
        where.type = type;
      }

      // Filter by date range
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // Search in source URL or media URL
      if (search) {
        where[Op.or] = [
          { url: { [Op.iLike]: `%${search}%` } },
          { src: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Get media records with pagination
      const results = await db.models.media.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [[sortBy, sortOrder]],
        attributes: ["id", "url", "type", "src", "createdAt", "updatedAt"],
      });

      // Calculate basic stats
      const stats = await db.models.media.findAll({
        where: { accountId },
        attributes: [
          "type",
          [db.fn("COUNT", db.col("id")), "count"],
          [db.fn("COUNT", db.fn("DISTINCT", db.col("url"))), "sourceCount"],
        ],
        group: ["type"],
      });

      const mediaStats = stats.reduce(
        (acc, stat) => {
          if (stat.type === "image") {
            acc.totalImages = parseInt(stat.getDataValue("count"), 10);
          } else {
            acc.totalVideos = parseInt(stat.getDataValue("count"), 10);
          }
          acc.totalSources = Math.max(
            acc.totalSources,
            parseInt(stat.getDataValue("sourceCount"), 10)
          );
          return acc;
        },
        { totalSources: 0, totalImages: 0, totalVideos: 0 }
      );

      return {
        data: results.rows.map((record) => ({
          id: record.id,
          sourceUrl: record.url,
          type: record.type,
          mediaUrl: record.src,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })),
        pagination: {
          total: results.count,
          page: parseInt(page, 10),
          totalPages: Math.ceil(results.count / limit),
          hasMore: page * limit < results.count,
        },
        stats: mediaStats,
        filters: {
          type: type || "all",
          search: search || null,
          dateRange: {
            start: startDate || null,
            end: endDate || null,
          },
        },
      };
    } catch (error) {
      logger.error("Failed to get media by account:", error);
      throw error;
    }
  }
}
