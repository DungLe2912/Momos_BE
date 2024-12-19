/* eslint-disable indent */
/* eslint-disable consistent-return */
/* eslint-disable no-loop-func */
/* eslint-disable no-plusplus */
/* eslint-disable function-paren-newline */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
import puppeteer from "puppeteer";
import Bull from "bull";
import Redis from "ioredis";
import { Op } from "sequelize";

import { logger } from "../middlewares/logger.middleware.js";
import db from "../database/index.js";

const BATCH_SIZE = 100; // Số lượng URLs xử lý trong 1 batch
const CONCURRENT_JOBS = 5; // Số lượng jobs chạy đồng thời
const CACHE_TTL = 3600; // Cache thời gian 1 giờ
const MAX_RETRIES = 3;
const BROWSER_POOL_SIZE = 3; // Số lượng browser instances trong pool

class ScraperService {
  constructor() {
    this.redis = new Redis({
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });

    this.scrapeQueue = new Bull("scrapeQueue", {
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
      },
      limiter: {
        max: 100,
        duration: 10000,
      },
      defaultJobOptions: {
        removeOnComplete: {
          age: 24 * 3600, // Giữ completed jobs trong 24 giờ
          count: 1000, // Giữ 1000 completed jobs gần nhất
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Giữ failed jobs trong 7 ngày
        },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    // Thêm event listeners để theo dõi job states
    this.scrapeQueue.on("completed", (job) => {
      this.updateJobStats(job, "completed");
    });

    this.scrapeQueue.on("failed", (job) => {
      this.updateJobStats(job, "failed");
    });

    // Khởi tạo Redis key để lưu job stats
    this.jobStatsKey = "scrapeQueue:stats";

    this.browserPool = [];
    this.initBrowserPool();

    // Process queue với concurrency control
    this.scrapeQueue.process(CONCURRENT_JOBS, this.processJob.bind(this));

    // Cleanup khi shutdown
    process.on("SIGTERM", this.cleanup.bind(this));
    process.on("SIGINT", this.cleanup.bind(this));
  }

  // Method để update job stats trong Redis
  async updateJobStats(job, status) {
    try {
      const accountId = job.data.accountId;
      const statsKey = `${this.jobStatsKey}:${accountId}`;

      await this.redis.hincrby(statsKey, status, 1);
      await this.redis.hincrby(statsKey, "total", 1);

      // Set expiration cho stats (ví dụ: 30 ngày)
      await this.redis.expire(statsKey, 30 * 24 * 3600);
    } catch (error) {
      logger.error("Failed to update job stats:", error);
    }
  }

  async initBrowserPool() {
    try {
      for (let i = 0; i < BROWSER_POOL_SIZE; i++) {
        const browser = await puppeteer.launch({
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--js-flags=--max-old-space-size=512", // Giới hạn memory cho V8
          ],
        });
        this.browserPool.push(browser);
      }
      logger.info(
        `Browser pool initialized with ${BROWSER_POOL_SIZE} instances`
      );
    } catch (error) {
      logger.error("Failed to initialize browser pool:", error);
      throw error;
    }
  }

  async getBrowserFromPool() {
    // Simple round-robin from pool
    const browser = this.browserPool.shift();
    this.browserPool.push(browser);
    return browser;
  }

  async processScrapedData(urls, media, accountId) {
    try {
      // Validate input
      if (!Array.isArray(urls) || !Array.isArray(media) || !accountId) {
        throw new Error(
          "Invalid input: urls and media must be arrays, and accountId is required"
        );
      }

      const mediaRecords = [];

      // Process từng URL và tách images/videos thành các records riêng
      urls.forEach((sourceUrl, index) => {
        const currentMedia = media[index];

        // Process images
        if (Array.isArray(currentMedia.images)) {
          currentMedia.images.forEach((imageUrl) => {
            mediaRecords.push({
              url: sourceUrl,
              type: "image",
              src: imageUrl,
              accountId,
            });
          });
        }

        // Process videos
        if (Array.isArray(currentMedia.videos)) {
          currentMedia.videos.forEach((videoUrl) => {
            mediaRecords.push({
              url: sourceUrl,
              type: "video",
              src: videoUrl,
              accountId,
            });
          });
        }
      });

      // Validate URLs và filter out invalid ones
      const validMediaRecords = mediaRecords.filter((record) => {
        try {
          new URL(record.src);
          return true;
        } catch (err) {
          logger.warn(
            `Invalid media URL: ${record.src} from source: ${record.url}`
          );
          return false;
        }
      });

      // Batch insert với chunk size để tránh quá tải database
      const CHUNK_SIZE = 1000;
      const results = [];

      for (let i = 0; i < validMediaRecords.length; i += CHUNK_SIZE) {
        const chunk = validMediaRecords.slice(i, i + CHUNK_SIZE);

        // Bulk create với handling duplicates
        const created = await db.models.media.bulkCreate(chunk, {
          updateOnDuplicate: ["type", "src", "updatedAt"],
          returning: true,
        });

        results.push(...created);
      }

      // Cache results grouped by source URL
      const groupedResults = results.reduce((acc, record) => {
        if (!acc[record.url]) {
          acc[record.url] = {
            images: [],
            videos: [],
          };
        }

        if (record.type === "image") {
          acc[record.url].images.push(record.src);
        } else {
          acc[record.url].videos.push(record.src);
        }

        return acc;
      }, {});

      // Update cache
      await Promise.all(
        Object.entries(groupedResults).map(([url, mediaData]) =>
          this.redis.set(
            `media:${accountId}:${url}`,
            JSON.stringify(mediaData),
            "EX",
            3600
          )
        )
      );

      // Return summary
      return {
        processed: {
          urls: new Set(results.map((r) => r.url)).size,
          total: results.length,
          images: results.filter((r) => r.type === "image").length,
          videos: results.filter((r) => r.type === "video").length,
        },
        results: groupedResults,
      };
    } catch (error) {
      logger.error("Failed to process scraped data:", error);
      throw error;
    }
  }

  async scrapeImageAndVideoURLs(urls, browser) {
    const results = [];
    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      );

      // Optimize memory usage
      await page.setCacheEnabled(false);
      await page.setRequestInterception(true);

      page.on("request", (request) => {
        if (["image", "stylesheet", "font"].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });

      for (const url of urls) {
        try {
          await page.goto(url, {
            waitUntil: "networkidle0",
            timeout: 30000,
          });

          const media = await page.evaluate(() => {
            const images = new Set();
            const videos = new Set();

            // Collect images
            document
              .querySelectorAll("img[src]")
              .forEach((img) => images.add(img.src));

            // Collect videos
            document
              .querySelectorAll("video source, video[src]")
              .forEach((video) => videos.add(video.src || video.currentSrc));

            return {
              images: Array.from(images).filter((src) =>
                src.startsWith("http")
              ),
              videos: Array.from(videos).filter((src) =>
                src.startsWith("http")
              ),
            };
          });

          results.push(media);
        } catch (error) {
          logger.error(`Error scraping ${url}: ${error.message}`);
          results.push({ images: [], videos: [] });
        }
      }

      return results;
    } finally {
      await page.close();
    }
  }

  async addScrapingTask(urls, accountId) {
    // Normalize to array
    const urlsArray = Array.isArray(urls) ? urls : [urls];

    // Check if the URLs were recently processed to prevent duplicate requests
    const recentUrls = await Promise.all(
      urlsArray.map((url) => this.redis.get(`recent:${accountId}:${url}`))
    );

    if (urlsArray.filter((_, index) => !recentUrls[index]).length === 0) {
      return {
        status: "skipped",
        message: "URLs were recently processed, skipping these requests.",
      };
    }

    // Check cache first
    const cachedResults = await Promise.all(
      urlsArray.map((url) => this.redis.get(`media:${accountId}:${url}`))
    );

    const uncachedUrls = urlsArray.filter((_, index) => !cachedResults[index]);

    if (uncachedUrls.length === 0) {
      return cachedResults.map((result) => JSON.parse(result));
    }

    // Split URLs into batches
    const batches = [];
    for (let i = 0; i < uncachedUrls.length; i += BATCH_SIZE) {
      batches.push(uncachedUrls.slice(i, i + BATCH_SIZE));
    }

    // Add batches to queue
    const jobs = await Promise.all(
      batches.map((batch) =>
        this.scrapeQueue.add(
          {
            urls: batch,
            accountId,
          },
          {
            attempts: MAX_RETRIES,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          }
        )
      )
    );

    // Cache the processed URLs to prevent resubmission in a short time
    await Promise.all(
      uncachedUrls.map((url) =>
        this.redis.setex(`recent:${accountId}:${url}`, 60, "processed")
      )
    );

    return {
      status: "queued",
      jobIds: jobs.map((job) => job.id),
      message: `Added ${uncachedUrls.length} URLs to processing queue in ${batches.length} batches`,
      cachedResults: cachedResults.filter(Boolean).map((r) => JSON.parse(r)),
    };
  }

  async processJob(job) {
    const { urls, accountId } = job.data;
    let currentAttempt = 0;

    while (currentAttempt < MAX_RETRIES) {
      try {
        const browser = await this.getBrowserFromPool();
        const media = await this.scrapeImageAndVideoURLs(urls, browser);
        return await this.processScrapedData(urls, media, accountId);
      } catch (error) {
        currentAttempt++;
        logger.error(`Attempt ${currentAttempt} failed: ${error.message}`);
        if (currentAttempt === MAX_RETRIES) throw error;
        await new Promise((resolve) => {
          setTimeout(resolve, 2000 * currentAttempt);
        });
      }
    }
  }

  async getScrapingResults({ jobIds, urls, page, limit, status, accountId }) {
    try {
      // Base where condition với accountId
      const where = { accountId };
      const targetUrls = new Set();

      // 1. Nếu có jobIds, lấy URLs từ các jobs trước
      if (jobIds && jobIds.length > 0) {
        const jobs = await Promise.all(
          jobIds.map((id) => this.scrapeQueue.getJob(id))
        );

        // Filter jobs theo status nếu có
        const filteredJobs = jobs.filter(
          (job) =>
            job &&
            job.data.accountId === accountId &&
            (!status || job.status === status)
        );

        // Collect tất cả URLs từ các jobs phù hợp
        filteredJobs.forEach((job) => {
          job.data.urls.forEach((url) => targetUrls.add(url));
        });
      }

      // 2. Thêm URLs được chỉ định trực tiếp
      if (urls && urls.length > 0) {
        urls.forEach((url) => targetUrls.add(url));
      }

      // 3. Nếu có URLs để filter
      if (targetUrls.size > 0) {
        where.url = {
          [Op.in]: Array.from(targetUrls),
        };
      }

      // 4. Lấy kết quả từ database với pagination
      const results = await db.models.media.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [["createdAt", "DESC"]],
        attributes: ["id", "url", "images", "videos", "createdAt", "updatedAt"],
      });

      // 5. Kiểm tra cache cho các URLs chưa có trong database
      const foundUrls = new Set(results.rows.map((r) => r.url));
      const missingUrls = Array.from(targetUrls).filter(
        (url) => !foundUrls.has(url)
      );

      if (missingUrls.length > 0) {
        const cachedResults = await Promise.all(
          missingUrls.map(async (url) => {
            const cached = await this.redis.get(`media:${accountId}:${url}`);
            if (!cached) return null;

            try {
              const parsed = JSON.parse(cached);
              return {
                url,
                ...parsed,
                fromCache: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            } catch (e) {
              logger.error(`Failed to parse cached result for ${url}:`, e);
              return null;
            }
          })
        );

        // Add valid cached results
        const validCachedResults = cachedResults.filter(Boolean);
        results.rows = [...results.rows, ...validCachedResults];
        results.count += validCachedResults.length;
      }

      // 6. Thêm thông tin job status cho mỗi result
      const enrichedResults = await Promise.all(
        results.rows.map(async (result) => {
          if (result.fromCache) return result;

          // Tìm job tương ứng với URL này
          const relatedJob = jobIds
            ? (
                await Promise.all(
                  jobIds.map((id) => this.scrapeQueue.getJob(id))
                )
              ).find((job) => job && job.data.urls.includes(result.url))
            : null;

          return {
            ...result.toJSON(),
            jobInfo: relatedJob
              ? {
                  jobId: relatedJob.id,
                  status: await relatedJob.getState(),
                  processedAt: relatedJob.processedOn,
                  finishedAt: relatedJob.finishedOn,
                }
              : undefined,
          };
        })
      );

      // 7. Prepare response với additional metadata
      return {
        data: enrichedResults,
        pagination: {
          total: results.count,
          page,
          totalPages: Math.ceil(results.count / limit),
        },
        summary: {
          totalUrls: targetUrls.size,
          foundInDb: results.rows.filter((r) => !r.fromCache).length,
          foundInCache: results.rows.filter((r) => r.fromCache).length,
          missing: targetUrls.size - results.rows.length,
        },
        jobsInfo: jobIds
          ? await this.getJobsBasicInfo(jobIds, accountId)
          : undefined,
      };
    } catch (error) {
      logger.error("Failed to get scraping results:", error);
      throw error;
    }
  }

  // Helper method để lấy basic job info
  async getJobsBasicInfo(jobIds, accountId) {
    const jobs = await Promise.all(
      jobIds.map(async (id) => {
        const job = await this.scrapeQueue.getJob(id);
        if (!job || job.data.accountId !== accountId) return null;

        return {
          id: job.id,
          status: await job.getState(),
          // eslint-disable-next-line no-underscore-dangle
          progress: job._progress,
          urls: job.data.urls.length,
          createdAt: job.timestamp,
          processedAt: job.processedOn,
          finishedAt: job.finishedOn,
          error: job.failedReason,
        };
      })
    );

    return jobs.filter(Boolean);
  }

  async getJobsStatus(jobIds, accountId) {
    try {
      const jobs = await Promise.all(
        jobIds.map((id) => this.scrapeQueue.getJob(id))
      );

      const statuses = await Promise.all(
        jobs.map(async (job) => {
          if (!job) return { id: job, status: "not_found" };

          const state = await job.getState();
          // eslint-disable-next-line no-underscore-dangle
          const progress = job._progress;
          const { urls } = job.data;

          // Kiểm tra quyền truy cập
          if (job.data.accountId !== accountId) {
            return { id: job.id, status: "unauthorized" };
          }

          // Lấy kết quả từ database nếu job đã hoàn thành
          let results = [];
          if (state === "completed") {
            results = await db.models.media.findAll({
              where: {
                url: { [Op.in]: urls },
                accountId,
              },
              attributes: ["url", "images", "videos"],
            });
          }

          return {
            id: job.id,
            status: state,
            progress,
            urls,
            results: state === "completed" ? results : undefined,
            error: job.failedReason,
            processedAt: job.processedOn,
            finishedAt: job.finishedOn,
          };
        })
      );

      return {
        jobs: statuses,
        summary: {
          total: statuses.length,
          completed: statuses.filter((s) => s.status === "completed").length,
          failed: statuses.filter((s) => s.status === "failed").length,
          waiting: statuses.filter((s) => s.status === "waiting").length,
          active: statuses.filter((s) => s.status === "active").length,
        },
      };
    } catch (error) {
      logger.error("Failed to get jobs status:", error);
      throw error;
    }
  }

  async getScrapingStats(accountId) {
    try {
      // Lấy thống kê từ database
      const dbStats = await db.models.media.findOne({
        where: { accountId },
        attributes: [
          [db.fn("COUNT", db.col("id")), "totalUrls"],
          [
            db.fn(
              "SUM",
              db.cast(db.fn("jsonb_array_length", db.col("images")), "INTEGER")
            ),
            "totalImages",
          ],
          [
            db.fn(
              "SUM",
              db.cast(db.fn("jsonb_array_length", db.col("videos")), "INTEGER")
            ),
            "totalVideos",
          ],
        ],
        raw: true,
      });

      // 1. Lấy real-time queue stats
      const currentCounts = await this.scrapeQueue.getJobCounts();

      // 2. Lấy accumulated stats từ Redis
      const statsKey = `${this.jobStatsKey}:${accountId}`;
      const accumulatedStats = (await this.redis.hgetall(statsKey)) || {
        completed: "0",
        failed: "0",
        total: "0",
      };

      // 3. Lấy active jobs cho account
      const activeJobs = await this.scrapeQueue.getActive();
      const accountActiveJobs = activeJobs.filter(
        (job) => job.data.accountId === accountId
      );

      // 4. Lấy waiting jobs cho account
      const waitingJobs = await this.scrapeQueue.getWaiting();
      const accountWaitingJobs = waitingJobs.filter(
        (job) => job.data.accountId === accountId
      );

      // 5. Tính performance metrics
      const completedJobs = parseInt(accumulatedStats.completed || 0);
      const failedJobs = parseInt(accumulatedStats.failed || 0);
      const totalProcessed = completedJobs + failedJobs;

      return {
        mediaStats: {
          totalUrls: parseInt(dbStats?.totalUrls, 10) || 0,
          totalImages: parseInt(dbStats?.totalImages, 10) || 0,
          totalVideos: parseInt(dbStats?.totalVideos, 10) || 0,
        },
        queueStats: {
          waiting: accountWaitingJobs.length,
          active: accountActiveJobs.length,
          completed: completedJobs,
          failed: failedJobs,
          total: parseInt(accumulatedStats.total || 0),
        },
        performance: {
          successRate:
            totalProcessed > 0 ? (completedJobs / totalProcessed) * 100 : 0,
          totalProcessed,
          currentlyProcessing: accountActiveJobs.length,
        },
        currentQueueState: {
          ...currentCounts,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      logger.error("Failed to get scraping stats:", error);
      throw error;
    }
  }

  async cleanup() {
    logger.info("Cleaning up resources...");

    await this.redis.flushall();

    await Promise.all([
      ...this.browserPool.map((browser) => browser.close()),
      this.redis.quit(),
      this.scrapeQueue.close(),
    ]);

    logger.info("Cleanup completed!");
  }
}

export default new ScraperService();
