require("dotenv/config");

const { DB_HOST, DB_PORT = 5432, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

const defaultConfig = {
  dialect: "postgres",
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  host: DB_HOST,
  port: Number(DB_PORT),
  define: {
    paranoid: true,
  },
};

const development = {
  ...defaultConfig,
};

const test = {
  ...defaultConfig,
  logging: false,
};

const production = {
  ...defaultConfig,
  logging: false,
};

module.exports = {
  development,
  test,
  production,
};
