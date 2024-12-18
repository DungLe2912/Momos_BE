import { Sequelize } from "sequelize";

import * as config from "../config/sequelize.cjs";

// import models
import accountsModel from "./models/accounts.js";
import mediaModel from "./models/media.js";

// Configuration
const env = process.env.NODE_ENV;
const sequelizeConfig = config[env];

// Create sequelize instance
const sequelize = new Sequelize({
  ...sequelizeConfig,
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Import all model files
const modelDefiners = [accountsModel, mediaModel];

// eslint-disable-next-line no-restricted-syntax
for (const modelDefiner of modelDefiners) {
  modelDefiner(sequelize);
}

// Associations
Object.keys(sequelize.models).forEach((modelName) => {
  if (sequelize.models[modelName].associate) {
    sequelize.models[modelName].associate(sequelize.models);
  }
});

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✓ Database & tables synced successfully!");
  } catch (error) {
    console.error("✕ Database sync failed:", error);
    throw error;
  }
};

syncDatabase();

export default sequelize;
