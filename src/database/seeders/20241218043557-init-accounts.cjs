const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface) => {
    const saltRounds = 10;

    await queryInterface.bulkInsert("accounts", [
      {
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
