import express from "express";
import "dotenv/config";
import cors from "cors";

import { authRouter } from "./routers/auth.router.js";
import { scrapingRouter } from "./routers/scrap.router.js";
import { mediaRouter } from "./routers/media.router.js";

import {
  errorHandlingMiddleware,
  loggerMiddleware,
  logger,
} from "./middlewares/index.js";

const app = express();

const { PORT } = process.env;

const port = PORT || 3000;

// Middleware
app.use(express.json());
app.use(loggerMiddleware);
// Configure CORS to allow requests from port 3001
app.use(
  cors({
    origin: "http://localhost:3001",
  })
);
// Router
app.use("/api/auth", authRouter);
app.use("/api/scrape", scrapingRouter);
app.use("/api/media", mediaRouter);

// Example route
app.get("/", (req, res) => {
  logger.info("Hello world route accessed");
  res.send("Hello, world!");
});

app.use(errorHandlingMiddleware);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
