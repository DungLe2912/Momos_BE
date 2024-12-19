const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const saltRounds = 10;

    await queryInterface.bulkInsert("accounts", [
      {
        id: uuidv4(),
        userName: "admin",
        email: "admin@gmail.com",
        password: await bcrypt.hash("password123", saltRounds),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("accounts", null, {});
  },
};
