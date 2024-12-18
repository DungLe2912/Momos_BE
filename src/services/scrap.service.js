/* eslint-disable no-await-in-loop */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-undef */
import puppeteer from "puppeteer";
import Bull from "bull";
import Redis from "ioredis";
import { logger } from "../middlewares/logger.middleware.js";
import db from "../database/index.js";

class ScraperService {
  constructor() {
    this.redis = new Redis(); // Redis client for caching
    this.scrapeQueue = new Bull("scrapeQueue", {
      redis: {
        host: "localhost",
        port: 6379,
      },
    });

    // Process queue jobs with rate limiting (10 concurrent jobs)
    this.scrapeQueue.process(10, this.processJob.bind(this));
  }

  async processScrapedData(url, media) {
    const { images, videos } = media;
    try {
      await db.models.media.create({ url, images, videos });
      return { url, images, videos };
    } catch (error) {
      logger.error(`Failed to save scraped data for ${url}: ${error.message}`);
      throw error;
    }
  }

  async scrapeImageAndVideoURLs(url) {
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });

    try {
      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      );

      // Increase timeout to 60s
      await page.goto(url, {
        waitUntil: ["load", "networkidle2"],
        timeout: 60000,
      });

      // Đợi body load
      await page.waitForSelector("body", { timeout: 60000 });

      // Scroll load lazy images
      await this.autoScroll(page);

      const media = await page.evaluate(() => {
        const images = Array.from(document.images)
          .map((img) => img.src)
          .filter((src) => src && src.startsWith("http"));

        const videos = Array.from(
          document.querySelectorAll("video source, video")
        )
          .map((video) => video.src || video.currentSrc)
          .filter((src) => src && src.startsWith("http"));

        return { images, videos };
      });

      return media;
    } catch (error) {
      logger.error(`Error scraping ${url}: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async addScrapingTask(url) {
    // Check cache
    const cachedResult = await this.redis.get(url);
    if (cachedResult) {
      logger.info(`Cache hit for URL: ${url}`);
      return JSON.parse(cachedResult);
    }

    // Kiểm tra xem URL này đã có trong queue chưa
    const existingJobs = await this.scrapeQueue.getJobs(["waiting", "active"]);
    const isUrlQueued = existingJobs.some((job) => job.data.url === url);

    if (isUrlQueued) {
      logger.info(`URL already queued: ${url}`);
      return { status: "queued", message: "URL is already being processed" };
    }

    // Add job into queue
    logger.info(`Adding URL to queue: ${url}`);
    const job = await this.scrapeQueue.add({ url });

    return {
      status: "queued",
      jobId: job.id,
      message: "URL has been added to the processing queue",
    };
  }

  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const { scrollHeight } = document.documentElement;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async processJob(job) {
    const { url } = job.data;
    const maxRetries = 3;
    let lastError;

    // eslint-disable-next-line no-plusplus
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `Processing URL: ${url} (Attempt ${attempt}/${maxRetries})`
        );

        const media = await this.scrapeImageAndVideoURLs(url);
        const result = await this.processScrapedData(url, media);

        // Cache kết quả
        await this.redis.set(url, JSON.stringify(result), "EX", 3600);
        return result;
      } catch (error) {
        lastError = error;
        logger.error(
          `Attempt ${attempt} failed for URL ${url}: ${error.message}`
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => {
            setTimeout(resolve, attempt * 1000);
          });
        }
      }
    }

    throw new Error(
      `Failed after ${maxRetries} attempts. Last error: ${lastError.message}`
    );
  }
}

export default new ScraperService();
