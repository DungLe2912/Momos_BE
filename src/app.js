import express from "express";
import { Sequelize } from "sequelize";
import "dotenv/config";

import { development, test, production } from "./config/sequelize.cjs";
import { authRouter } from "./routers/auth.router.js";
import {
  errorHandlingMiddleware,
  loggerMiddleware,
} from "./middlewares/index.js";

const app = express();

const { NODE_ENV, PORT } = process.env;

const port = PORT || 3000;
let env = development;
switch (NODE_ENV) {
  case "production":
    env = production;
    break;
  case "test":
    env = test;
    break;
  default:
    env = development;
    break;
}
// Initialize Sequelize
const sequelize = new Sequelize(env);

// Test the Sequelize connection
sequelize
  .authenticate()
  .then(() => {
    console.log(
      `Connection has been established successfully with ${NODE_ENV} db.`
    );
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

// Middleware
app.use(express.json());
app.use(loggerMiddleware);
app.use("/api/auth", authRouter);

// Example route
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.use(errorHandlingMiddleware);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
