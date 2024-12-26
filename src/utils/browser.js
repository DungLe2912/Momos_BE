import puppeteer from "puppeteer";

class BrowserManager {
  constructor() {
    this.browser = null;
    this.initPromise = null;
    this.retries = 0;
    this.maxRetries = 3;
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log("Initializing browser...");

        this.browser = await puppeteer.launch({
          headless: "new",
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
          ],
          ignoreHTTPSErrors: true,
          timeout: 60000, // Tăng timeout lên 60s
          protocolTimeout: 60000,
          waitForInitialPage: true,
        });

        console.log("Browser initialized successfully");

        // Reset promise after browser closes
        this.browser.on("disconnected", () => {
          console.log("Browser disconnected, attempting to reconnect...");
          this.browser = null;
          this.initPromise = null;
          if (this.retries < this.maxRetries) {
            this.retries++;
            this.init();
          }
        });

        this.retries = 0; // Reset retries on successful connection
        return this.browser;
      } catch (error) {
        console.error("Failed to initialize browser:", error);

        if (this.retries < this.maxRetries) {
          this.retries++;
          console.log(
            `Retrying browser initialization (attempt ${this.retries}/${this.maxRetries})...`
          );
          this.initPromise = null;
          return this.init();
        }

        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  async getBrowser() {
    if (!this.browser) {
      await this.init();
    }
    return this.browser;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.initPromise = null;
    }
  }
}

export const browserManager = new BrowserManager();

// Handle process termination
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing browser...");
  await browserManager.close();
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing browser...");
  await browserManager.close();
});

// Handle uncaught errors
process.on("unhandledRejection", async (error) => {
  console.error("Unhandled Rejection:", error);
  await browserManager.close();
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  await browserManager.close();
});
